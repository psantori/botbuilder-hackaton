const { Bot } = require('botbuilder');
const { BotFrameworkAdapter } = require('botbuilder-services');
const restify = require('restify');
const { LuisRecognizer } = require('botbuilder-ai');

const appId = '9c2497c5-aa37-4e7a-a01d-71c4d6d931ad';
const subscriptionKey = 'bc45c7b8804f40469ee76ac329d707df';
const model = new LuisRecognizer(appId, subscriptionKey);

// Create server
let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log(`${server.name} listening to ${server.url}`);
});

const adapter = new BotFrameworkAdapter({ 
    appId: process.env.MICROSOFT_APP_ID, 
    appPassword: process.env.MICROSOFT_APP_PASSWORD 
});
server.post('/api/messages', adapter.listen());

const bot = new Bot(adapter)
    .onReceive((context) => {
    	if (context.request.type === 'message') {
			return model.recognize(context)
	            .then((intents) => LuisRecognizer.findTopIntent(intents))
	            .then((intent) => {
        			context.reply(`Hello World ${intent.name} (${intent.score}) ${JSON.stringify(intent.entities)}`);
	               /*switch (intent ? intent.name : 'None') {
	                    case 'Weather':
	                        return replyWithWeather(context);
	                    default:
	                        return replyWithHelp(context);
	                }*/
	            })
	            .catch(err => console.log(err));
    	} else {
    		// ignore
    	}
        
    });
