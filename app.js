'use strict';
require('dotenv').config();
const { Bot, BotStateManager, MemoryStorage, MessageStyler, CardStyler } = require('botbuilder');
const { BotFrameworkAdapter } = require('botbuilder-services');
const express = require('express');
var bodyParser = require('body-parser');

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

const bot = new Bot(adapter);	
// bot.use(new MemoryStorage());
// bot.use(new BotStateManager());
bot.onReceive((context) => {
    if (context.request.type === 'message') {
        context.reply(context.request.text);

    }
});