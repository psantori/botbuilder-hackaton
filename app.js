require('dotenv').config();
const { Bot, BotStateManager, MemoryStorage, MessageStyler, CardStyler } = require('botbuilder');
const { BotFrameworkAdapter } = require('botbuilder-services');
const express = require('express');
const bodyParser = require('body-parser');
const agentsManager = require('./agentsManager.js');
const usersManager = require('./usersManager.js');
const cmdManager = require('./cmdManager.js');
const bookingService = require('./modules/booking-service.js');
const sprintf = require('sprintf').sprintf;

const agentIds = ['default-user'];
const handOffs = [];

const { LuisRecognizer } = require('botbuilder-ai');

let lastPostLuisIntent = undefined;
let lastPostLuisPrompt = undefined;
const luis = new LuisRecognizer({
    serviceEndpoint: 'https://westeurope.api.cognitive.microsoft.com',
    appId: process.env.LUIS_APP_ID,
    subscriptionKey: process.env.LUIS_SUBSCRIPTION_KEY
});

const getAgentHandOff = (conversationReference) => {
    return new Promise((resolve, reject) => {
        const found = handOffs.find(hf => hf.agentRef.conversationId === conversationReference.conversationId);
        resolve(found);
    });
}

const getUserHandOff =  (conversationReference) => {
    return new Promise((resolve, reject) => {
        const found = handOffs.find(hf => hf.userRef.conversationId === conversationReference.conversationId);
        resolve(found);
    });
}

const addHandOff = (agentRef, userRef) => {
    return new Promise((resolve, reject) => {
        const handoff = {
            agentRef: agentRef,
            userRef: userRef
        };
        handOffs.unshift(handoff);
        resolve(handoff);
    });
}

const delHandOff = (agentRef, userRef) => {
    return new Promise((resolve, reject) => {
        const foundIndex = handOffs.findIndex(
            hf => hf.agentRef.conversationId === agentRef.conversationId || hf.userRef === userRef.conversationId
        );
        let deleted = null;
        if (foundIndex >= 0) {
            deleted = handOffs.splice(foundIndex, 1);
        }
        resolve(deleted.length?deleted[0]:null);
    });
}

const getQueueAgentMessage = (msgText) => {
		let msg = generateSuggestedActions(['Yes', 'No']);
		msg.text = `${msgText}`;
		return msg;
}

const sendPaMessageToContext = (paContext, msg) => {
	return new Promise((resolve, reject) => {
		bot.createContext(paContext, (context) => {
			resolve(context.reply(msg));
		});
	});
}
const sendPAQueueMessageToAgent = (agent) => {
	return new Promise((resolve, reject) => {
		usersManager.getWaitingCount()
		.then(result => {
			if (result) {
				const msgText = `There are ${result} customers waiting in queue.`;
				const msg = getQueueAgentMessage(`${msgText}\n\rDo you want contact next?`);
				bot.createContext(agent.conversationReference, (context) => {
					context.state.conversation['lastAsk'] = 'next-queue';
					context.reply(msg);
				});
				return true;
			}
			return false;
		})
		.then(result => resolve(result))
		.catch(err => reject(err));
	});
}
const sendPAQueueMessageToAgents = () => {
	return new Promise((resolve, reject) => {
		let agents = [];
		agentsManager.findListeningAgents()
		.then(result => agents = result)
		.then(result => usersManager.getWaitingCount())
		.then(result => {
			if (result) {
				const msgText = `There are ${result} customers waiting in queue.`;
				const msg = getQueueAgentMessage(`${msgText}\n\rDo you want contact next?`);
				agents.forEach(agent => {
					bot.createContext(agent.conversationReference, (context) => {
						context.state.conversation['lastAsk'] = 'next-queue';
						context.reply(msg);
					});
				});
				return true;
			}
			return false;
		})
		.then(result => resolve(result))
		.catch(err => reject(err));
	});
}

const generateMenuBtns = () => {
	return MessageStyler.suggestedActions(['Handle your appointment', 'Talk to human assistant']);
}

const generateSuggestedActions = (acts) => {
	return MessageStyler.suggestedActions(acts);
}

const sendWelcome = (context) => {
	return new Promise((resolve, reject) => {
		context.showTyping();
		if (context.state.user['isAgent']) {
			context.reply(`Welcome agent ${context.request.from.name}`);
			usersManager.getWaitingCount()
			.then(result => {
				const msgText = `There are ${result?result:'no'} customers waiting in queue.`;
				if (!result) {
					return context.reply(msgText);
				}
				const msg = getQueueAgentMessage(`${msgText}\n\rDo you want contact next?`);
				context.state.conversation['lastAsk'] = 'next-queue';
				return context.reply(msg);
			})
			.catch(err => reject(err))
			.then(result => resolve())
			.catch(err => console.log(err));
		} else {
			let msg = generateMenuBtns();
			msg.text = `Welcome ${context.request.from.name || 'customer'}!\n\rHow can I help you?`;
			context.reply(msg);
			resolve(true);
		}
	});
}

const manageAgentMessage = (context) => {
	return new Promise((resolve, reject) => {
		const message = context.request.text;
		switch (context.state.conversation['lastAsk']) {
			case 'next-queue':
				context.state.conversation['lastAsk'] = undefined;
				if (message.toLowerCase() === 'yes') {
					let handOff = null;
					usersManager.nextWaitingUser()
					.then(result => {
						if (result) {
							return addHandOff(context.conversationReference, result.conversationReference)
							
						}
						return false;
					})
					.then(result => handOff = result)
					.then(result => {
						if (handOff) {
							return [
								agentsManager.setBusy(handOff.agentRef),
								usersManager.setBusy(handOff.userRef)
							];
						}
						return true;
					})
					.then(result => {
						if (handOff) {
							return [
								sendPaMessageToContext(handOff.agentRef, `You are now connected to ${handOff.userRef.user.name}\n\rType "#!end" to disconnect`),
								sendPaMessageToContext(handOff.userRef, `You are now connected to ${handOff.agentRef.user.name}`),
							];

						}
						return true;
					})
					.then(result => resolve())
					.catch(err => reject(err));
				} else {
					agentsManager.setOffline(context.conversationReference)
					.then(result => context.reply(`You are now in offline status.\n\rType "#!online" to change it back`))
					.then(result => resolve())
					.catch(err => reject(err));
				}
			break;
			default:
				if (context.state.conversation.command) {
					const cmd = context.state.conversation.command;
					context.state.conversation.command = undefined;
					let handOff = null;
					getAgentHandOff(context.conversationReference)
					.then(result => handOff = result)
					.then(result => agentsManager.findAgent(context.conversationReference.user.id))
					.then(result => {
						if (result) {
							const promises = [];
							if (cmd.command.label === 'online') {
								promises.push(agentsManager.setOnline(context.conversationReference));
								promises.push(sendPAQueueMessageToAgent(result));
							} else if (cmd.command.label === 'end') {
								let msg = generateMenuBtns();
								msg.text = `You are disconnected from ${handOff.agentRef.user.name}\n\rHow can I help you?`;
								promises.push(sendPaMessageToContext(handOff.agentRef, `You are disconnected from ${handOff.userRef.user.name}`));
								promises.push(sendPaMessageToContext(handOff.userRef, msg));
								promises.push(agentsManager.setOnline(context.conversationReference));
								// promises.push(usersManager.setWaiting(handOff.userRef));
								promises.push(usersManager.delUser(handOff.userRef));
								promises.push(delHandOff(context.conversationReference, handOff.userRef));
								promises.push(sendPAQueueMessageToAgent(result));
							} else if (cmd.command.label === 'me') {
								promises.push(context.reply(`Name: ${result.name}\n\rStatus: ${result.status}`));
							}
							return promises;
						}
						return true;
					})
					.then(result => resolve())
					.catch(err => reject(err));
				} else {
					getAgentHandOff(context.conversationReference)
					.then(result => {
						if (result) {
							return sendPaMessageToContext(result.userRef, context.request.text);
						}
						return true;
					})
					.then(result => resolve())
					.catch(err => reject(err));
				}
		}
	})
}

const manageUserMessage = (context) => {
	return new Promise((resolve, reject) => {
		const message = context.request.text;
		getUserHandOff(context.conversationReference)
					.then(result => {
						if (result) {
							return sendPaMessageToContext(result.agentRef, context.request.text);
						}
						return true;
					})
					.then(result => resolve())
					.catch(err => reject(err));
	});
};

const connectToHuman = (context) => {
	return new Promise((resolve, reject) => {
		let user = null;
		context.state.conversation['action'] = 'talking';
		usersManager.addUser(context.conversationReference)
		.then(result => {
			// if (result.status === usersManager.STATUS.waiting) {
				context.reply('Please wait, you will be connected to a sales agent soon');
			// }
			return user = result;
		})
		.then(result => sendPAQueueMessageToAgents())
		.then(result => resolve(result))
		.catch(err => reject(err));
	});
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
router.get('/health', function(req, res) {
	res.send('UP');
});
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
bot.use(cmdManager);
// Define the bots onReceive message handler
bot.onReceive((context) => {
	console.log('OnReceive activity: ' + context.request.type);
	if (context.request.type === 'message' && context.request.text === '#!reset') {
		context.state.conversation = {};
		context.state.user = {};
		context.reply('Reset done');
		return;
	}
	if (context.request.type === 'message' && 
		(context.request.text === 'Talk to human assistant' || context.request.text === 'Handle your appointment')) {
		context.state.conversation['action'] = undefined;
	}
	if (context.request.type === 'message' && context.state.conversation['action'] === 'booking') {
		const convRef = context.conversationReference;
		
		return luis.recognize(context)
				.then(result => {
					return LuisRecognizer.findTopIntent(result)
						.then(result => {
							context.state.user.intent = lastPostLuisIntent;
							context.state.user.promptStatus = lastPostLuisPrompt;
							console.log("luis result " + result);
							return bookingService.doIt(context, result)
							.then(result => {
								console.log('booking service response: ', result);
								if (!result.continue) {
									context.state.conversation['action'] = undefined;
								}
								lastPostLuisIntent = result.intent;
								lastPostLuisPrompt = result.promptStatus;
								bot.createContext(convRef, (context) => {
									if (result.done) {
										context.reply(result.response);
									}
									if (!result.continue) {
										let msg = generateMenuBtns();
										msg.text = `What else can I do for you?`;
										context.reply(msg);	
									}
								});
							})
							.catch(err => console.log(err));
						});
				});
	} else {
		return new Promise((resolve, reject) => {
			// const isAgent = agentIds.includes(context.request.from.id);
			if (!context.state.user['isAgent'] && agentIds.includes(context.request.from.id)) {
				context.state.user['isAgent'] = true;
			}
			if (context.request.type === 'conversationUpdate' && !context.state.conversation['welcomeSent']) {
				context.state.conversation['welcomeSent'] = true;
				sendWelcome(context)
				.then(result => context.state.user['isAgent']?agentsManager.addAgent(context.conversationReference):true)
				.then(result => resolve())
				.catch(err => reject(err));
				// .catch(err => console.log(err));
			} else if (context.request.type === 'message') {
				if (context.state.user['isAgent']) {
					// context.showTyping();
					manageAgentMessage(context)
					.then(result => resolve())
					.catch(err => reject(err));
					// context.reply('Oops, nobody is listening!');
				} else {
					const message = context.request.text;
					if (context.state.conversation['action'] === 'talking') {
						manageUserMessage(context)
						.then(result => resolve())
						.catch(err => reject(err));
					} else { 
						if (message === 'Talk to human assistant') {
								context.state.conversation['action'] = 'talking';
								context.showTyping();
								connectToHuman(context)
								.then(result => resolve())
								.catch(err => reject(err));
							} else if (message === 'Handle your appointment') {
								context.state.conversation['action'] = 'booking';
								let bookingServiceResponse  = bookingService.start(context);
								console.log('booking service response: ', bookingServiceResponse)
								if (bookingServiceResponse.done) {
									context.reply(bookingServiceResponse.response);
								}
								resolve();
							} else {
								const msg = generateMenuBtns();
								msg.text = `Please, select one of the suggested actions.`;
								context.reply(msg);
								resolve();
							}
					}
				}
			}
			//resolve();
		});	
	}
});