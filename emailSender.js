const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const moment = require('moment');

dotenv.config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendEmail(sentDataCount, error, recipientEmails, allUsers) {
  try {
    const currentDate = moment().format('DD-MM-YYYY');

    // Chame a função e obtenha o texto formatado
    const formattedUsers = allUsers.map(user => {
      return `
        <li>
          <strong>Nome:</strong> ${user.nome}<br>
          <strong>Telefone:</strong> ${user.telefone}<br>
          <strong>Dosagem:</strong> ${user.dosagem} ${user.dosagemGrandeza}<br>
          <strong>Medicamento:</strong> ${user.medicamento}<br>
          <strong>Hora:</strong> ${user.hora}:${user.minutos}
        </li>
      `;
    });

    const emailPromises = recipientEmails.map(recipient => {
      const [email, name] = recipient.split('|');
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Relatório do dia ${currentDate} de Envio de Dados para o LeTalk e Status de Erros`,
        html: `
          <div style="font-family: Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 0;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
              <h1 style="color: #5D67E2; text-align: center;">Relatório de Envio de Dados</h1>
              <p>Prezado(a) ${name},</p>
              <p style="font-size: 16px; line-height: 1.6;">Espero que este email o encontre bem. Gostaríamos de fornecer a você um resumo do envio de dados realizado no dia ${currentDate}, referente à nossa colaboração com o LeTalk. Este relatório tem o objetivo de informá-lo sobre a quantidade de dados enviados e fornecer detalhes sobre qualquer problema ou erro que tenha ocorrido durante o processo.</p>
    
              <h2>Resumo do Envio de Dados:</h2>
              <ul>
                <li><strong>Total de Dados Enviados:</strong> ${sentDataCount}</li>
                <li><strong>Erro:</strong> ${error}</li>
                <li><strong>Usuários que receberam lembretes:</strong>
                  <ul>
                    ${formattedUsers.join('')}
                  </ul>
                </li>
              </ul>
    
              <p>Agradecemos por sua atenção a este relatório. Estamos trabalhando ativamente para resolver quaisquer problemas que tenham surgido e garantir que o envio de dados para o LeTalk seja eficiente e preciso. Se você tiver alguma dúvida ou precisar de mais informações, por favor, não hesite em entrar em contato conosco. Estamos à disposição para ajudar.</p>
    
              <div style="margin-top: 30px; text-align: center; color: #6c757d;">
                <p>Agradecemos pela sua colaboração contínua e esperamos continuar nossa parceria de forma bem-sucedida.</p>
                <p>Atenciosamente,<br>
                  Matheus Carvalho<br>
                  DevJunior<br>
                  DigitalForest<br>
                  Email: ${process.env.EMAIL_USER}<br>
                  Telefone: ${process.env.PHONE_NUMBER}</p>
              </div>
            </div>
          </div>
        `
      };
    
      return transporter.sendMail(mailOptions);
    });
    

    await Promise.all(emailPromises);
    console.log('Emails sent successfully!');
  } catch (emailError) {
    console.error('Error while sending emails:', emailError);
  }
}

module.exports = sendEmail;