'use strict';
require('dotenv').config();
const { Bot, BotStateManager, MemoryStorage } = require('botbuilder');
const { BotFrameworkAdapter } = require('botbuilder-services');
const restify = require('restify');
//const apmtConnector = require('./modules/appointment-connector.js');
const luisConnector = require('./modules/luis-connector.js');
const createIntent = require('./modules/create-intent.js');
const deleteIntent = require('./modules/delete-intent.js');


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
                    return context.reply('I will create: \n' + JSON.stringify(userIntent, null, 2));
                } else if (userIntent.action == 'delete') {
                    return context.reply('I will delete: \n' + JSON.stringify(userIntent, null, 2));
                }    

            } else if (!context.state.user['intent']) {
                return context.reply('Sorry, i don\'t understand your request');
            }
        })
        .catch(err => context.reply(`ERROR: ${err}`));
    }
});


