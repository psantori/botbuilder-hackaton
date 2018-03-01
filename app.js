require('dotenv').config();
const { Bot, BotStateManager, MemoryStorage, MessageStyler, CardStyler } = require('botbuilder');
const { BotFrameworkAdapter } = require('botbuilder-services');
const express = require('express');
const bodyParser = require('body-parser');
const agentsManager = require('./agentsManager.js');
const cmdManager = require('./cmdManager.js');
const sprintf = require('sprintf').sprintf;

const agentIds = ['agent-007'];
const handOffs = [];

const getAgentHandOff = (conversationReference) => {
    return new Promise((resolve, reject) => {
        const found = handOffs.find(hf => hf.agentRef.coversationId === conversationReference.conversationId);
        resolve(found);
    });
}

const getUserHandOff =  (conversationReference) => {
    return new Promise((resolve, reject) => {
        const found = handOffs.find(hf => hf.userRef.coversationId === conversationReference.conversationId);
        resolve(found);
    });
}

const addHandOff = (agentRef, userRef) => {
    return new Promise((resolve, reject) => {
        const handoff = {
            agentRef: agentRef,
            userRef: userRef
        };
        handOffs.push(handoff);
        resolve(handoff);
    });
}

const delHandOff = (agentRef, userRef) => {
    return new Promise((resolve, reject) => {
        const foundIndex = handOffs.findIndex(
            hf => hf.agentRef.coversationId === agentRef.conversationId || hf.userRef === userRef.conversationId
        );
        let deleted = null;
        if (foundIndex >= 0) {
            deleted = handOffs.splice(foundIndex, 1);
        }
        resolve(deleted);
    });
}

const getListeningAgent = () => {
    return agentsManager.findListeningAgent();
}

const generateMenuBtns = () => {
	return MessageStyler.suggestedActions(['Book a visit to a store', 'Talk to human assistant']);
}

// Create server
const server = express();
const router = express.Router(); 


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
    console.log(`${server.name} listening to ${this.address().address}:${this.address().port}`);
});
// Initialize bot by passing it adapter
const bot = new Bot(adapter);	
bot.use(new MemoryStorage());
bot.use(new BotStateManager());
// bot.use(cmdManager);
// Define the bots onReceive message handler
bot.onReceive((context) => {
	if (context.request.type === 'conversationUpdate' && context.request.membersAdded && 
		context.request.membersAdded.length && context.request.membersAdded[0].name === 'Bot') {
		return;
	}
	const isAgent = agentIds.includes(context.request.from.id);
	if (context.request.type === 'conversationUpdate') {
		if (isAgent) {
			context.reply(`Welcome agent ${context.request.from.name}`);
		} else {
			const msg = generateMenuBtns();
			msg.text = `Welcome ${context.request.from.name}\n\rHow can I help you?`;
			context.reply(msg);			
		}
	} else if (context.request.type === 'message') {
		if (isAgent) {
			context.reply('Oops, nobody is listening!');
		} else {
			const message = context.request.text;
			if (message === 'Talk to human assistant') {
				context.reply('Please wait, you will be connected to a sales agent soon...');
				context.showTyping();

			} else {
				const msg = generateMenuBtns();
				msg.text = `Please, select one of the suggested actions.`;
				context.reply(msg);
			}
		}
	}
	
});