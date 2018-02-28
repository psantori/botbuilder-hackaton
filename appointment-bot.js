'use strict';
require('dotenv').config();
const { Bot, BotStateManager, MemoryStorage } = require('botbuilder');
const { BotFrameworkAdapter } = require('botbuilder-services');
const restify = require('restify');
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
let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log(`${server.name} listening to ${server.url}`);
});

// Create adapter and listen to servers '/api/messages' route.
const adapter = new BotFrameworkAdapter({ 
    appId: process.env.MICROSOFT_APP_ID, 
    appPassword: process.env.MICROSOFT_APP_PASSWORD 
});
server.post('/api/messages', adapter.listen());

const parseIntent = (context, userState, luisIntent) => {
    const intent = INTENTS[luisIntent.name];
    
    if ((!userState['intent'] && intent.action === 'create') || (userState['intent'] && userState['intent'].action === 'create')) {
        if(!userState['intent']) {
            userState['intent'] = intent; 
        }
        return createIntent.checkEntities(context, userState, luisIntent);
    } else if ((!userState['intent'] && intent.action === 'delete') || (userState['intent'] && userState['intent'].action === 'delete')) {
        if(!userState['intent']) {
            userState['intent'] = intent; 
        }
        return deleteIntent.checkEntities(context, userState, luisIntent);
    } else if ((!userState['intent'] && intent.action === 'show') || (userState['intent'] && userState['intent'].action === 'show')) {
        if(!userState['intent']) {
            userState['intent'] = intent; 
        }
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
                
                if (userIntent.action == 'create') {
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
                } else if (userIntent.action == 'delete') {
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
                    
                } else if (userIntent.action == 'show') {
                    context.reply('I will show your appointment: \n' + JSON.stringify(userIntent, null, 2));
                    return apmtConnector.getAppointments({})
                    .then(result => {
                        return context.reply(`Done with result: ${JSON.stringify(result)}`);
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


