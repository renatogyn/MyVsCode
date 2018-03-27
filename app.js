//var restify = require('restify');
//var builder = require('botbuilder');
//var cognitiveservices = require('../../../lib/botbuilder-cognitiveservices');

const builder = require('botbuilder')
const restify = require('restify')
const cognitiveservices = require('botbuilder-cognitiveservices')
const request = require('request')

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log(`%s Servidor executando no %s`, server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
bot.set('storage', new builder.MemoryBotStorage());         // Register in-memory state storage
server.post('/api/messages', connector.listen());

//=========================================================
// Recognizers
//=========================================================

var qnarecognizer = new cognitiveservices.QnAMakerRecognizer({
    knowledgeBaseId:'239cf80e-c216-4d7f-9efb-5544dfbb9eef',
    subscriptionKey:'bde49a53a0a14a83adcbb242df6d6777',
    top: 4});

var qnarecognizer2 = new cognitiveservices.QnAMakerRecognizer({
    knowledgeBaseId:'b7424c56-2401-4bd2-8f5f-607c60b99671',
    subscriptionKey:'bde49a53a0a14a83adcbb242df6d6777',
    top: 4});

var qnarecognizer3 = new cognitiveservices.QnAMakerRecognizer({
    knowledgeBaseId:'750d2ffa-8bca-478a-8c0c-c69e14416ac2',
    subscriptionKey:'bde49a53a0a14a83adcbb242df6d6777',
    top: 4});

var model='https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/8da3cd98-6e0b-4240-84c0-e0fd550b7305?subscription-key=cc23b0b82473426e916b88f80107480f&verbose=true&timezoneOffset=0&q=';
var recognizer = new builder.LuisRecognizer(model);

//=========================================================
// Bot Dialogs
//=========================================================
var intents = new builder.IntentDialog({ recognizers: [recognizer, qnarecognizer, qnarecognizer2, qnarecognizer3] });
bot.dialog('/', intents);

intents.matches('Cumprimento', (session, args, next) => {
    session.send('Olá!, seja bem vindo, o que você deseja?')
})

intents.matches('Sobre', (session, args, next) => {
    session.send('Eu sou o Botão, pode me chamar de Seu Botão, ta afim de algo ou só enxer o saco mesmo?')
})

intents.matches('Bitcoin', builder.DialogAction.send('Não entendi sua dúvida quanto a **Bitcoin**'));

intents.matches('Habitacao', builder.DialogAction.send('Não entendi sua dúvida quanto a **Financiamento Habitacional**'));

intents.matches('Veiculo', builder.DialogAction.send('Não entendi sua dúvida quanto a **Financiamento de Veiculo**'));

intents.matches('Cotacao', (session, args, next) => {
    //session.send('olá moeda')
    const moedas = builder.EntityRecognizer.findAllEntities(args.entities, 'Moeda').map(m => m.entity).join(',')
    session.send('Humm, estou consultado, só um segundo!')
    //const message = moedas.map(m => m.entity).join(',')
    //session.send(`Eu farei a cotação das moedas **${message}**`)
    request(`http://api-cotacoes-maratona-bots.azurewebsites.net/api/Cotacoes/${moedas}`, (err, res, body) => {
        if(err || !body)
            return session.send('Desculpe, não foi possível consultar a cotação')

        const cotacoes = JSON.parse(body)
        session.send(cotacoes.map(m => `${m.nome}: **${m.valor}**`).join(`\n\n`))
    })
})

intents.matches('qna', [
    function (session, args, next) {
        var answerEntity = builder.EntityRecognizer.findEntity(args.entities, 'answer');
        session.send(answerEntity.entity);
    }
]);

intents.onDefault([
    function(session){
        session.send('Me desculpe, não entendi. :(');
    }
]);

bot.on('conversationUpdate', (update) => {
    if (update.membersAdded) {
        update.membersAdded.forEach( (identity) => {
            if (identity.id === update.address.bot.id) {
                bot.loadSession(update.address, (err, session) => {
                    if(err)
                        return err
                    const message = 'Olá, eu sou o **Botão**, pode me chamar de **Seu Botão**, por enquanto so consigo te ajudar com os assuntos abaixo:\n' +
                    '* **Tirar dúvidas sobre financiamento habitacional**\n' +
                    '* **Tirar dúvidas sobre financiamento de veículos**\n' +
                    '* **Tirar dúvidas sobre Bitcoin**\n' +
                    '* **Verificar a cotação do dia para algumas moedas**\n'
                    session.send(message)
                })
            }
        })
    }
})