'use strict';

const { LuisRecognizer } = require('botbuilder-ai');
const { MessageStyler, CardStyler } = require('botbuilder');
const createIntent = require('./create-intent.js');
const apmtConnector = require('./appointment-connector.js');

const luis = new LuisRecognizer({
    serviceEndpoint: 'https://westeurope.api.cognitive.microsoft.com',
    appId: process.env.LUIS_APP_ID,
    subscriptionKey: process.env.LUIS_SUBSCRIPTION_KEY
});


const INTENTS = {
    'create-appointment': { 
            action: 'create',
            date: null,
            storeId: null,
            agentId: null,
            userId: null
        },
    'delete-appointment': { 
            action: 'delete',
            date: null,
            storeId: null,
            agentId: null,
            userId: null
        },
    'show-appointment': { 
            action: 'show',
            date: null,
            storeId: null,
            agentId: null,
            userId: null
        },
    'date': {
            action: 'date',
            date: null
        },
    'location': {
            action: 'location',
            storeId: null
        },
    'None': {
            action: 'none',
            value: null
        }
};

const start = (context, text) => {
    console.log("booking service start");
    context.state.conversation['action'] = 'booking';
    let model = {};
    model.done = true;
    model.response = MessageStyler.suggestedActions(['Take an appointment', 'List my appointment']);
    model.response.text = text ? text : "What would you like to do?";
    return model;
            
}

const doIt = (context, luisIntent) => {
    return new Promise((resolve, reject) => {
        console.log("booking service doIt");
        const message = context.request.text;
        let model = start(context, `I'm sorry, I don't understood.`);

        if (message === 'Take an appointment' || context.state.user['intent'].action === INTENTS['create-appointment'].action) {
            console.log('start take an appointment');
            const intent = INTENTS['create-appointment'];
            context.state.user['intent'] = intent; 
            let createNextStep = createIntent.checkEntities(context, context.state.user, luisIntent);
            if (createNextStep) {
                model.response = createNextStep;
                resolve(model);
            } else {
                //model.response = 'i will create';
                let userIntent = context.state.user['intent'];
                return apmtConnector.setAppointment({
                    date: userIntent.date,
                    storeId: userIntent.storeId,
                    agentId: userIntent.agentId,
                    userId: context.request.from.id
                })
                .then(result => {
                    model.response = `Done with result: ${JSON.stringify(result)}`;
                })
                .then(result => resolve(model))
                .catch(err => context.reply(`Oops, i got an error: ${err}`));
            }
        } else {
            resolve(model);
        }
    });   
}

module.exports = {
    start,
    doIt
}