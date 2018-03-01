'use strict';
require('dotenv').config();
const { Bot, BotStateManager, MemoryStorage, MessageStyler, CardStyler } = require('botbuilder');
const { BotFrameworkAdapter } = require('botbuilder-services');
const express = require('express');
var bodyParser = require('body-parser');
const apmtConnector = require('./modules/appointment-connector.js');
const luisConnector = require('./modules/luis-connector.js');
const createIntent = require('./modules/create-intent.js');
const deleteIntent = require('./modules/delete-intent.js');
const showIntent = require('./modules/show-intent.js');


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

// Create server
var server = express();
var router = express.Router(); 

// Create adapter and listen to servers '/api/messages' route.
const adapter = new BotFrameworkAdapter({ 
    appId: process.env.MICROSOFT_APP_ID, 
    appPassword: process.env.MICROSOFT_APP_PASSWORD 
});

router.post('/api/messages', adapter.listen());
server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());
server.use('/', router);
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log(`${server.name} listening`);
});

console.log();

const clearPrompt = (context) => {
    context.state.user['prompt'] = undefined;
}

const startPrompt = (context, action) => {
    context.state.user['prompt'] = action;
}

const writeAppointmentCard = (context, appointment) => {
    let myAppointment = [];
    appointment.forEach(element => {
        myAppointment.push(
            CardStyler.heroCard(`At ${element.date} in ${element.storeId} with ${element.agentId}`, [], [])
        );
    });
    
    if (myAppointment.length === 0) {
        //TODO chiedere se vuole un appuntamento
        return context.reply("You don't have any appointment");
    } else if (myAppointment.length === 1) {
        return context.reply(MessageStyler.attachment(myAppointment[0]));
    } else {
        return context.reply(MessageStyler.carousel(myAppointment));
    }   
}

const checkIntent = (context, intent, action) => {
    let result = false;
    if ((!context.state.user['intent'] && intent.action === action) 
    || (context.state.user['intent'] && context.state.user['intent'].action === action)) {
        if(!context.state.user['intent']) {
            context.state.user['intent'] = intent; 
            startPrompt(context, action);
        }
        result = true;
    }

    return result;
}

const parseIntent = (context, userState, luisIntent) => {
    const intent = INTENTS[luisIntent.name];
    
    if (checkIntent(context, intent, 'create')) {
        return createIntent.checkEntities(context, userState, luisIntent);
    } else if (checkIntent(context, intent, 'delete')) { 
    
        return deleteIntent.checkEntities(context, userState, luisIntent);
    } else if (checkIntent(context, intent, 'show')) { 
    
        return showIntent.checkEntities(context, userState, luisIntent);
    }
    return false;
}

// Initialize bot by passing it adapter
const bot = new Bot(adapter);	
bot.use(new MemoryStorage());
bot.use(new BotStateManager());
bot.onReceive((context) => {
    if (context.request.type === 'conversationUpdate') {
        if (context.request.membersAdded.length && context.request.membersAdded[0].name !== 'Bot') {
            context.showTyping();
            context.reply(`Welcome ${context.request.from.name}, how can i help you?`);
        }
    }
    if (context.request.type === 'message') {
    
        return luisConnector.recognize(context)
        .then(result => parseIntent(context, context.state.user, result))
        .then(result => {
            if (result) {
                const userIntent = context.state.user['intent'];
                context.state.user['intent'] = undefined;
                const prompt = context.state.user['prompt'];
                clearPrompt(context);
                
                if (prompt == 'create') {
                    context.reply('I will create: \n' + JSON.stringify(userIntent, null, 2));
                    return apmtConnector.setAppointment({
                        date: userIntent.date,
                        storeId: userIntent.storeId,
                        agentId: userIntent.agentId,
                        userId: context.request.from.id
                    })
                    .then(result => {
                        return context.reply(`Done with result: ${JSON.stringify(result)}`);
                    })
                    .catch(err => context.reply(`Oops, i got an error: ${err}`));
                } else if (prompt == 'delete') {
                    context.reply('I will delete: \n' + JSON.stringify(userIntent, null, 2));
                    return apmtConnector.getAppointments({date: userIntent.date, userId: context.request.from.id})
                    .then(result => {
                        if (result.success && result.data.length) {
                            return apmtConnector.deleteAppointment(result.data[0].id);
                        }
                        return null;
                    })
                    .then(result => context.reply(result && result.success?'Done':`Error: ${result?result.error:''}`))
                    .catch(err => context.reply(`Oops, i got an error: ${err}`));
                    
                } else if (prompt == 'show') {
                    return apmtConnector.getAppointments({})
                    .then(result => {
                        if (result.success) {
                            writeAppointmentCard(context, result.data);
                            /*let myAppointment = [];
                            result.data.forEach(element => {
                                myAppointment.push(
                                    CardStyler.heroCard(`At ${element.date} in ${element.storeId} with ${element.agentId}`, [], [])
                                );
                            });
                            
                            if (myAppointment.length === 0) {
                                //TODO chiedere se vuole un appuntamento
                                return context.reply("You don't have any appointment");
                            } else if (myAppointment.length === 1) {
                                return context.reply(MessageStyler.attachment(myAppointment[0]));
                            } else {
                                return context.reply(MessageStyler.carousel(myAppointment));
                            }*/
                        } else {
                            return context.reply(`BOH with result: ${JSON.stringify(result)}`);
                        }
                        
                    })
                    .catch(err => context.reply(`Oops, i got an error: ${err}`));
                }    

            } else if (!context.state.user['intent']) {
                return context.reply('Sorry, i don\'t understand your request');
            }
        })
        .catch(err => context.reply(`ERROR: ${err}`));
    }
});


