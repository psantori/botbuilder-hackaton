'use strict';

const { MessageStyler, CardStyler } = require('botbuilder');

const model = () => ({ 
    action: 'create',
    date: null,
    storeId: null,
    agentId: null,
    userId: null
});

const parseIntent = (userState, luisIntent) => {
    luisIntent.entities.forEach(ent => {
        switch(ent.type) {
            case 'agent':
                userState['intent'].agentId = ent.entity;
            break;
            case 'location':
                userState['intent'].storeId = ent.entity;
            break;
            case 'builtin.datetimeV2.date':
                userState['intent'].date = ent.resolution.values.pop().value; 
            break;
            
            default:
        }
    });
    return true;
}

const checkEntities = (context, userState, luisIntent) => {
    return new Promise((resolve, reject) => {
        parseIntent(userState, luisIntent);
        let missing = null;
        if (!userState['intent'].date) {
            missing = 'Ok, when you want set the appointment?';
        } else if (!userState['intent'].storeId) {
            missing = 'Well, what Store do you prefer';
        } else if (!userState['intent'].agentId) {
            if (luisIntent.name != 'None') {
                missing = 'Do you want select Store Assistant?';
            } else if (context.request.text.toLowerCase() == 'yes') {
                missing = MessageStyler.carousel([
                    CardStyler.heroCard(null, ['https://randomuser.me/api/portraits/women/44.jpg'], ['Vivian']),
                    CardStyler.heroCard(null, ['https://randomuser.me/api/portraits/men/49.jpg'], ['Gerard'])
                  ]);
            } else if (context.request.text.toLowerCase() != 'vivian' || context.request.text.toLowerCase() != 'michael') {
                missing = context.request.text + ' isn\'t available. Only Vivian or Michael';
            } 
            
        }
        if (missing) {
            context.reply(missing);
            resolve(false);
        } else {
            resolve(true);
        }
    });
}

module.exports = {
    checkEntities
}