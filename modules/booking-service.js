'use strict';

const { LuisRecognizer } = require('botbuilder-ai');
const { MessageStyler, CardStyler } = require('botbuilder');
const createIntent = require('./create-intent.js');
const showIntent = require('./show-intent.js');
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
        model.continue = true;

        if (message === 'Take an appointment' || (context.state.user['intent'] && context.state.user['intent'].action === INTENTS['create-appointment'].action)) {
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

                    //model.response = `Done with result: ${JSON.stringify(result)}`;
                    //{“success”:true,“error”:null,“data”:{“userId”:“default-user”,“storeId”:“milan”,“agentId”:null,“date”:“2018-05-05”,“id”:“a270c435-a44d-baab-a4bf-308d3f0f0754”}}
                    if (!result.error) {
                        let appointment = result.data;
                        model.response = MessageStyler.attachment(CardStyler.heroCard(`At ${appointment.date} in ${appointment.storeId} with ${appointment.agentId}`, [], []));
                        model.continue = false;
                        context.state.user['intent'].date = null;
                        context.state.user['intent'].storeId = null;
                        context.state.user['intent'].agentId = null;
                        context.state.user['intent'].userId = null;
                        context.state.user['intent'] = undefined;
                    } else {
                        model.response = data.error;
                        model.continue = false;
                        context.state.user['intent'].date = null;
                        context.state.user['intent'].storeId = null;
                        context.state.user['intent'].agentId = null;
                        context.state.user['intent'].userId = null;
                        context.state.user['intent'] = undefined;
                    }

                })
                .then(result => resolve(model))
                .catch(err => context.reply(`Oops, i got an error: ${err}`));
            }
        } else if (message === 'List my appointment' || (context.state.user['intent'] && context.state.user['intent'].action === INTENTS['show-appointment'].action)) {
            console.log('start list an appointment');
            const intent = INTENTS['show-appointment'];
            context.state.user['intent'] = intent; 
            let userIntent = context.state.user['intent'];

            let model = {};
            model.done = true;
            model.continue = true;

            return apmtConnector.getAppointments({})
            .then(result => {
                if (result.success) {
                    //writeAppointmentCard(context, result.data);
                    let myAppointment = [];
                    result.data.forEach(element => {
                        myAppointment.push(
                            CardStyler.heroCard(`At ${element.date} in ${element.storeId} with ${element.agentId}`, [], [])
                        );
                    });
                    
                    if (myAppointment.length === 0) {
                        //TODO chiedere se vuole un appuntamento
                        model.response = `You don't have any appointment`;
                        model.continue = false;
                        context.state.user['intent'] = undefined;
                    } else if (myAppointment.length === 1) {
                        model.response = MessageStyler.attachment(myAppointment[0]);
                        model.continue = false;
                        context.state.user['intent'] = undefined;
                    } else {
                        model.response = MessageStyler.carousel(myAppointment);
                        model.continue = false;
                        context.state.user['intent'] = undefined;
                    }
                } else {
                    model.response = `BOH with result: ${JSON.stringify(result)}`;
                    context.state.user['intent'] = undefined;
                    model.continue = false;
                    model.done = false;
                }
                
            })
            .then(result => resolve(model))
            .catch(err => context.reply(`Oops, i got an error: ${err}`));
        } else {
            resolve(model);
        }
    });   
}

module.exports = {
    start,
    doIt
}