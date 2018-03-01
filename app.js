const { Bot, BotStateManager, MemoryStorage } = require('botbuilder');
const { BotFrameworkAdapter } = require('botbuilder-services');
const restify = require('restify');
const agentsManager = require('./agentsManager.js');
const cmdManager = require('./cmdManager.js');
const sprintf = require('sprintf').sprintf;

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

// Initialize bot by passing it adapter
const bot = new Bot(adapter);	
bot.use(new MemoryStorage());
bot.use(new BotStateManager());
bot.use(cmdManager);
// Define the bots onReceive message handler
bot.onReceive((context) => {
	const command = context.state.conversation.command;
	
	if (command && command.isCommand) {
		let promise = null;
		let responseMsg = null;
		switch (command.cmdString) {
			case 'login':
				promise = agentsManager.addAgent(context.conversationReference);
				break;
			case 'logout':
				promise = agentsManager.delAgent(context.conversationReference);
				break;
			case 'end':
				promise = agentsManager.setListening(context.conversationReference);
				break;
			case 'agents':
				promise = agentsManager.getAgents(context.conversationReference);
				break;
		}
		if (promise) {
			promise
				.then(result => {
					responseMsg = sprintf(command.command.successMsg, result);
					context.reply(responseMsg);
				})
				.catch( err => {
					rensponseMsg = sprintf(command.command.failureMsg, err);
					context.reply(responseMsg);
				});
	
		}
		
	}
	
});