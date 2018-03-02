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
        const id = conversationReference.user.id;
        let result = users[id];
        if (!result) {
            result = userModel();
            result.conversationReference = conversationReference;
            result.id = id;
            result.name = conversationReference.user.name;
            result.status = STATUS.waiting;
            users[id] = result;
        }
        resolve(result);
    });
}

const delUser = (conversationReference) => {
    return new Promise((resolve, reject) => {
        findUser(conversationReference.user.id)
        .then(result => {
            if (!result) {
                reject('User not found');
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
        if (users[userId]) {
            resolve(users[userId]);
        } else {
            reject(`User ${userId} not found`);
        } 
    });
}



const setStatus = (userId, status) => {
    return new Promise((resolve, reject) => {
        findUser(userId)
        .then(result => {
            if (result) {
                result.status = status;
                resolve(result);
            } else {
                reject('User not found');
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

const nextWaitingUser = () => {
    return new Promise((resolve, reject) => {
        const foundId = Object.keys(users).find(userId => users[userId].status === STATUS.waiting);
        resolve(users[foundId]);
    });
}

const getWaitingCount = () => {
    return new Promise((resolve, reject) => {
        const countIds = Object.keys(users).filter(userId => users[userId].status === STATUS.waiting).length;
        resolve(countIds);
    });
}

const setBusy = (conversationReference) => setStatus(conversationReference.user.id, STATUS.busy);
const setWaiting = (conversationReference) => setStatus(conversationReference.user.id, STATUS.waiting);

const me = (conversationReference) => findUser(conversationReference.user.id);



module.exports = {
    STATUS,
    addUser,
    delUser,
    findUser,
    nextWaitingUser,
    setWaiting,
    setBusy,
    getUsers,
    getWaitingCount,
    me
}
