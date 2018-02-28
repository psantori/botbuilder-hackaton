'use strict';

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
            missing = 'Do you want select Store Assistant?';
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