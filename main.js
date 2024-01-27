const { Pool } = require('pg');
const axios = require('axios');
const moment = require('moment-timezone');
const dotenv = require('dotenv');
const sendEmail = require('./emailSender');

dotenv.config();

const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
};

const webhookUrl = process.env.WEBHOOK_URL;
const dailyConsumptionTable = process.env.DAILY_CONSUMPTION_TABLE;
const allConsumptionTable = process.env.ALL_CONSUMPTION_TABLE;
const recipientEmails = process.env.RECIPIENT_EMAILS.split(',');

const dbPool = new Pool(dbConfig);

let totalDataSent = 0;
let allUsers = [];
let emailSentToday = false;

async function getCurrentHourSaoPaulo() {
  const saoPauloTimezone = moment.tz('America/Sao_Paulo');
  return saoPauloTimezone.format('HH');
}

async function getCurrentMinuteSaoPaulo() {
  const saoPauloTimezone = moment.tz('America/Sao_Paulo');
  return saoPauloTimezone.format('mm');
}

async function fetchDataFromDatabase(hour, minutes) {
  const dbClient = await dbPool.connect();
  try {
    const sqlQuery = `SELECT * FROM ${dailyConsumptionTable} WHERE hora = $1 AND minutos = $2`;
    const queryResult = await dbClient.query(sqlQuery, [hour, minutes]);
    return queryResult.rows;
  } catch (error) {
    handleDbError(error);
    throw error;
  } finally {
    dbClient.release();
  }
}

async function sendToWebhook(data) {
  try {
    await axios.post(webhookUrl, data);
    console.log("Dados enviados para o webhook:", data)
    totalDataSent++;
    allUsers.push(data);
  } catch (error) {
    handleWebhookError(error);
  }
}

async function handleDbError(error) {
  await sendEmail(totalDataSent, error, recipientEmails, allUsers);
}

async function handleWebhookError(error) {
  await sendEmail(totalDataSent, error, recipientEmails, allUsers);
}

async function sendDataToWebhook() {
  try {
    const currentHourSaoPaulo = await getCurrentHourSaoPaulo();
    const currentMinuteSaoPaulo = await getCurrentMinuteSaoPaulo();
    const dataFromDatabase = await fetchDataFromDatabase(currentHourSaoPaulo, currentMinuteSaoPaulo);

    await Promise.all(dataFromDatabase.map(async (row) => {
      const addZeroToLeft = (value) => (value < 10 ? `0${value}` : value);
      const dataToSend = {
        telefone: row['proprietario'],
        dosagemGrandeza: row['dosagem_(grandeza)'],
        dosagem: row.dosagem,
        medicamento: row['remedio'],
        hora: row.hora,
        minutos: addZeroToLeft(row.minutos), 
        nome: row.nome,
      };
    
      await sendToWebhook(dataToSend);
    }));

    if (currentHourSaoPaulo === '20' && !emailSentToday) {
      await sendEmail(totalDataSent, 0, recipientEmails, allUsers);
      resetEmailCounters();
    } else if (currentHourSaoPaulo !== '20') {
      emailSentToday = false;
    }
  } catch (error) {
    handleDataProcessingError(error);
  }
}

function resetEmailCounters() {
  totalDataSent = 0;
  allUsers = [];
  emailSentToday = true;
}

async function handleDataProcessingError(error) {
  await sendEmail(totalDataSent, error, recipientEmails, allUsers);
  resetEmailCounters();
}

async function formatPhoneNumber(number) {
  const cleanNumber = number.replace(/\D/g, "");
  const isValidLength = cleanNumber.length == 11;

  return {
      isValidLength,
      formattedNumber: isValidLength ? `55${cleanNumber}` : null
  };
}


async function insertDataToDestinationTableI(data) {
  
  let client = null;
  try {
    client = await dbPool.connect();

    const checkQuery = `
      SELECT COUNT(*)
      FROM ${dailyConsumptionTable}
      WHERE "proprietario" = $1
        AND "dosagem_(grandeza)" = $2
        AND "dosagem" = $3
        AND "remedio" = $4
        AND "hora" = $5
        AND "minutos" = $6
        AND "nome" = $7
    `;
  
    const checkValues = [
      data.proprietario,
      data["dosagem_(grandeza)"],
      data.dosagem,
      data.remedio,
      data.hora,
      data.minutos,
      data.nome
    ];

    const result = await client.query(checkQuery, checkValues);

    const isDataAlreadyPresent = result.rows[0].count > 0;

    if (!isDataAlreadyPresent) {
      const insertQuery = `
        INSERT INTO ${dailyConsumptionTable} ("proprietario", "dosagem_(grandeza)", "dosagem", "remedio", "hora", "minutos", "nome")
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      const insertValues = [
        data.proprietario,
        data["dosagem_(grandeza)"],
        data.dosagem,
        data.remedio,
        data.hora,
        data.minutos,
        data.nome
      ];

      console.log("Cadastrando novo medicamento:", insertValues)
      await client.query(insertQuery, insertValues);

    }

  } catch (err) {
    console.error("Error inserting data to destination table:", err);
  } finally {
    if (client) {
      client.release();
    }
  }
}

async function processAllConsumptionData() {
  let client = null;
  try {
    client = await dbPool.connect();

    const sourceData = await client.query(`
      SELECT *
      FROM ${allConsumptionTable}
      WHERE 
        "numero de Cel" IS NOT NULL
        AND "forma" IS NOT NULL
        AND "Dosagem_consumptionSchedule" IS NOT NULL
        AND "Nome do medicamento" IS NOT NULL
        AND "Acomp_hora" IS NOT NULL
        AND "Acomp_min" IS NOT NULL
        AND "Nome" IS NOT NULL
    `);

    for (const row of sourceData.rows) {
      const phoneNumberFormatted = await formatPhoneNumber(row["numero de Cel"]);

      const dataToInsert = {
        "proprietario": phoneNumberFormatted.formattedNumber,
        "dosagem_(grandeza)": row["forma"],
        "dosagem": row.Dosagem_consumptionSchedule,
        "remedio": row["Nome do medicamento"],
        "hora": row.Acomp_hora,
        "minutos": row.Acomp_min,
        "nome": row["Nome"],
      };

      if (phoneNumberFormatted.isValidLength) {
        await insertDataToDestinationTableI(dataToInsert);
    }
      
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    if (client) {
      client.release();
    }
  }
}

let currentRows = 0

async function countLines() {
  try {
    const result = await dbPool.query(`SELECT COUNT(*) FROM ${allConsumptionTable}`);
    const rowCount = result.rows[0].count;
    if (rowCount > currentRows) {
      processAllConsumptionData();
      currentRows = rowCount;
    }
  } catch (error) {
    console.error('Error running row counter:', error);
  }
}

sendDataToWebhook();
setInterval(sendDataToWebhook, 60000);
countLines()
setInterval(countLines, 60000);
