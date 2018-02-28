'use strict';
require('dotenv').config();
const { Bot, BotStateManager, MemoryStorage } = require('botbuilder');
const { BotFrameworkAdapter } = require('botbuilder-services');
const restify = require('restify');
const apmtConnector = require('./modules/appointment-connector.js');
const luisConnector = require('./modules/luis-connector.js');
const createIntent = require('./modules/create-intent.js');


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
    if(!userState['intent']) {
        userState['intent'] = intent; 

    }
    if ((!userState['intent'] && intent.action === 'create') || userState['intent'].action === 'create') {
        return createIntent.checkEntities(context, userState, luisIntent);
    }
    return context.reply('Sorry, I don\'t understand your request.');
    
}

// Initialize bot by passing it adapter
const bot = new Bot(adapter);	
bot.use(new MemoryStorage());
bot.use(new BotStateManager());
// bot.use(luisConnector.luis);
bot.onReceive((context) => {
    // context.reply(context.request.type);
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
                return context.reply('I understood: \n' + JSON.stringify(context.state.user['intent'], null, 2));
            }
        })
        .catch(err => context.reply(`ERROR: ${err}`));
    }
});


