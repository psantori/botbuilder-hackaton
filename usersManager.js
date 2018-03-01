'use strict';

const users = {};

const STATUS = {
    waiting: 'waiting',
    busy: 'busy'
};

const userModel = () => {
    return {
        conversationReference: null,
        id: null,
        name: null,
        status: null
    }
}


const addUser = (conversationReference) => {
    return new Promise((resolve, reject) => {
        findUser(conversationReference.user.id)
        .then(result => {
            if (result) {
               reject('Agente già presente');
            } else {
                const toAdd = userModel();
                toAdd.conversationReference = conversationReference;
                toAdd.id = conversationReference.user.id;
                toAdd.name = conversationReference.user.name;
                toAdd.status = STATUS.waiting;
                users[toAdd.id] = toAdd;
                resolve(toAdd);
            }
        })
        .catch(err => reject(err));
        
    });
}

const delUser = (conversationReference) => {
    return new Promise((resolve, reject) => {
        findUser(conversationReference.user.id)
        .then(result => {
            if (!result) {
                reject('Agente non trovato');
            } else {
                const toDel = users[conversationReference.user.id];
                users[conversationReference.user.id] = undefined;
                resolve(toDel);
            }
        })
        .catch(err => reject(err));
    });
}

const findUser = (userId) => {
    return new Promise((resolve, reject) => {
        resolve(users[userId]);
    });
}



const setStatus = (userId, status) => {
    return new Promise((resolve, reject) => {
        findAgent(userId)
        .then(result => {
            if (result) {
                result.status = status;
                resolve(result);
            } else {
                reject('Agente non trovato');
            }
        })
        .catch(err => reject(err));
    });
}

const getUsers = (conversationReference) => {
    return new Promise((resolve, reject) => {
        resolve(Object.keys(users).map(userId => Object.assign({}, users[userId], {conversationReference: undefined})));
    });
}

const findWaitingUser = () => {
    return new Promise((resolve, reject) => {
        const foundId = Object.keys(users).find(userId => users[userId].status === STATUS.listening);
        resolve(users[foundId]);
    });
}

const setBusy = (conversationReference) => setStatus(conversationReference.user.id, STATUS.busy);
const setWaiting = (conversationReference) => setStatus(conversationReference.user.id, STATUS.waiting);

const me = (conversationReference) => findUser(conversationReference.user.id);



module.exports = {
    addUser,
    delUser,
    findUser,
    findWaitingUser,
    setWaiting,
    setBusy,
    getUsers,
    me
}
