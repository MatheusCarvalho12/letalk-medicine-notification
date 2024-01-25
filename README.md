Documentação
==================================

Este documento fornece uma explicação detalhada do código em Node.js fornecido. O código é um script que interage com um banco de dados PostgreSQL, recupera dados específicos, os formata e os envia para um webhook. Além disso, o script monitora uma tabela adicional no banco de dados, inserindo dados formatados em uma tabela de consumo diário, e envia e-mails em caso de erros.

Dependências
------------

O script utiliza várias dependências que devem ser instaladas para garantir o funcionamento adequado:

*   [pg](https://node-postgres.com/) (PostgreSQL Client para Node.js)
*   axios (Cliente HTTP para fazer solicitações ao webhook)
*   moment-timezone (Manipulação de datas e horas, ajustado para o fuso horário de São Paulo)
*   dotenv (Carregar variáveis de ambiente a partir de um arquivo `.env`)
*   Módulo personalizado `emailSender` (funções para enviar e-mails)

Certifique-se de instalar essas dependências antes de executar o script.

bashCopy code

`npm install pg axios moment-timezone dotenv`

Configuração Base Banco de Dados
------------

O script utiliza variáveis de ambiente para armazenar informações sensíveis e configurações. Essas variáveis devem ser definidas em um arquivo `.env` no mesmo diretório do script. Aqui estão as variáveis de ambiente necessárias:

*   `DB_USER`: Usuário do banco de dados PostgreSQL
*   `DB_HOST`: Host do banco de dados PostgreSQL
*   `DB_DATABASE`: Nome do banco de dados PostgreSQL
*   `DB_PASSWORD`: Senha do banco de dados PostgreSQL
*   `DB_PORT`: Porta do banco de dados PostgreSQL
*   `WEBHOOK_URL`: URL do webhook para enviar os dados formatados
*   `DAILY_CONSUMPTION_TABLE`: Nome da tabela no banco de dados onde os dados diários são armazenados
*   `ALL_CONSUMPTION_TABLE`: Nome da tabela no banco de dados de todos os consumos
*   `RECIPIENT_EMAILS`: Lista de e-mails separados por vírgulas para os quais os alertas de erro devem ser enviados

Funcionamento do Script
-----------------------

O script segue as etapas a seguir:

1.  **Configuração Inicial**: Importa as dependências, configura as variáveis de ambiente e cria uma instância do cliente PostgreSQL.
    
2.  **Obtenção da Hora Atual em São Paulo**: Define funções para obter a hora e os minutos atuais no fuso horário de São Paulo.
    
3.  **Recuperação de Dados do Banco de Dados**: Consulta o banco de dados para obter os dados de consumo correspondentes à hora e aos minutos atuais.
    
4.  **Envio para o Webhook**: Formata os dados recuperados e os envia para o webhook especificado.
    
5.  **Verificação de Envio de E-mail Diário**: Verifica se a hora atual é 20:00. Se verdadeiro e um e-mail ainda não foi enviado hoje, envia um e-mail resumindo os dados enviados.
    
6.  **Reset dos Contadores de E-mail**: Reinicia os contadores de e-mail após o envio diário.
    
7.  **Formatação de Número de Telefone**: Remove caracteres não numéricos e adiciona o código de país (55) ao número de telefone.
    
8.  **Inserção de Dados na Tabela de Destino**: Verifica se os dados já estão presentes na tabela de destino antes de inseri-los, evitando duplicatas.
    
9.  **Processamento de Dados de Consumo Completo**: Obtém dados de uma tabela de todos os consumos, formata-os e os insere na tabela de consumo diário.
    
10.  **Contagem de Linhas da Tabela de Todos os Consumos**: Monitora a tabela de todos os consumos e processa novas linhas conforme necessário.
    
11.  **Execução Inicial e Intervalos**: Chama a função principal para enviar dados para o webhook, configura intervalos regulares para repetir a execução e monitora a tabela de todos os consumos.
    

Lembre-se de ajustar os intervalos de execução conforme necessário para atender aos requisitos específicos do seu caso de uso.

### Configuração Inicial

#### `dotenv.config()`

Carrega as variáveis de ambiente do arquivo `.env` para fornecer configurações sensíveis, como credenciais do banco de dados e URLs do webhook.

#### `const dbConfig = { ... }`

Define um objeto de configuração para o cliente PostgreSQL, usando as variáveis de ambiente para configurar usuário, host, nome do banco de dados, senha e porta.

#### `const webhookUrl = process.env.WEBHOOK_URL;`

Atribui à variável `webhookUrl` a URL do webhook obtida a partir das variáveis de ambiente.

#### `const dbPool = new Pool(dbConfig);`

Cria uma instância do cliente PostgreSQL (`dbPool`) usando as configurações especificadas.

#### Variáveis Globais

*   `let totalDataSent = 0;`
*   `let allUsers = [];`
*   `let emailSentToday = false;`

Variáveis globais usadas para rastrear o número total de dados enviados, uma lista de todos os usuários para os quais os dados foram enviados e um indicador se o e-mail já foi enviado no dia.

### Funções de Tempo

#### `async function getCurrentHourSaoPaulo()`

#### `async function getCurrentMinuteSaoPaulo()`

Ambas as funções retornam a hora e os minutos atuais no fuso horário de São Paulo usando a biblioteca `moment-timezone`.

### Acesso ao Banco de Dados

#### `async function fetchDataFromDatabase(hour, minutes)`

Conecta ao banco de dados, executa uma consulta SQL para obter os dados correspondentes à hora e aos minutos fornecidos e retorna os resultados.

#### `async function insertDataToDestinationTableI(data)`

Insere dados formatados na tabela de consumo diário, evitando duplicatas verificando se os dados já estão presentes na tabela.

### Enviando para o Webhook

#### `async function sendToWebhook(data)`

Envia os dados formatados para a URL do webhook usando a biblioteca `axios`. Registra os dados enviados e os usuários correspondentes.

### Tratamento de Erros

#### `async function handleDbError(error)`

#### `async function handleWebhookError(error)`

#### `async function handleDataProcessingError(error)`

Essas funções tratam os erros que ocorrem durante a execução do script, enviando e-mails de alerta contendo detalhes sobre o erro, o número total de dados enviados e a lista de usuários.

### Processamento Principal

#### `async function sendDataToWebhook()`

Principal função que realiza o processo principal do script. Obtém os dados do banco de dados, formata-os e os envia para o webhook. Também gerencia o envio diário de e-mails resumidos.

#### `function resetEmailCounters()`

Reinicia os contadores de e-mail após o envio diário.

### Outras Funcionalidades

#### `async function formatPhoneNumber(number)`

Formata um número de telefone, removendo caracteres não numéricos e adicionando o código do país (55).

#### `async function processAllConsumptionData()`

Obtém dados de uma tabela de todos os consumos, formata-os e os insere na tabela de consumo diário.

#### `async function countLines()`

Conta as linhas na tabela de todos os consumos e processa novas linhas conforme necessário.

### Execução Inicial e Intervalos

O script inicia chamando `sendDataToWebhook()` e, em seguida, configura intervalos regulares para repetir a execução dessa função e monitorar a tabela de todos os consumos.

Por fim, o script utiliza o `setInterval` para chamar as funções `sendDataToWebhook` e `countLines` a cada 60 segundos, mas esses valores podem ser ajustados conforme necessário.
