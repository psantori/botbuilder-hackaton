const { Bot } = require('botbuilder');
const { BotFrameworkAdapter } = require('botbuilder-services');
const restify = require('restify');
const agentsManager = require('./agentsManger.js');
const prefix = '#!';

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

// Define the bots onReceive message handler
bot.onReceive((context) => {
    const { MessageStyler } = require('botbuilder');

    if (context.request.type === 'message') {
		const message = context.request.text || '';
		let responseText = null;
		if (message.indexOf(prefix) === 0) {
			const cmd = message.substr(prefix.length);
			switch(cmd) {
				case `login`:
					agentsManager.addAgent(context.conversationReference)
					.then(result => {
						responseText = `Bevenuto ${result.name}!`;
					})
					.catch(err => {
						responseText = `Err: ${err}`;						
						console.log(err)
					})
					.then(result => context.reply(responseText));
				break;
				case `logout`:
					agentsManager.delAgent(context.conversationReference)
					.then(result => {
						responseText = `Arrivederci ${result.name}!`;
					})
					.catch(err => {
						responseText = `Err: ${err}`;						
						console.log(err)
					})
					.then(result => context.reply(responseText));	
				break;
				case `end`:
					agentsManager.setListening(context.conversationReference)
					.then(result => {
						responseText = '😀';
					})
					.catch(err => {
						responseText = `Err: ${err}`;						
						console.log(err)
					})
					.then(result => context.reply(responseText));
				break;
				case `online`:
					agentsManager.setOnline(context.conversationReference)
					.then(result => {
						responseText = '😀';
					})
					.catch(err => {
						responseText = `Err: ${err}`;						
						console.log(err)
					})
					.then(result => context.reply(responseText));
				break;
				case `offline`:
					agentsManager.setOffline(context.conversationReference)
					.then(result => {
						responseText = '😀';
					})
					.catch(err => {
						responseText = `Err: ${err}`;						
						console.log(err)
					})
					.then(result => context.reply(responseText));
				break;
				case `busy`:
					agentsManager.setBusy(context.conversationReference)
					.then(result => {
						responseText = '😀';
					})
					.catch(err => {
						responseText = `Err: ${err}`;						
						console.log(err)
					})
					.then(result => context.reply(responseText));
				break;
				case `me`:
					agentsManager.me(context.conversationReference)
					.then(result => {
						responseText = JSON.stringify(result, null, 2);
					})
					.catch(err => {
						responseText = `Err: ${err}`;						
						console.log(err)
					})
					.then(result => context.reply(responseText));
				break;
				case `agents`:
					agentsManager.getAgents(context.conversationReference)
					.then(result => {
						responseText = JSON.stringify(result, null, 2);
					})
					.catch(err => {
						responseText = `Err: ${err}`;						
						console.log(err)
					})
					.then(result => context.reply(responseText));
				break;
				default:
					responseText = `Non capisco il comando ${cmd}`;
			}
			if (responseText) {
				context.reply(responseText);
			}
		}
    }
});