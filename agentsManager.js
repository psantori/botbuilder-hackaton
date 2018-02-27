'use strict';

const agents = {};

const STATUS = {
    listening: 'listening',
    busy: 'busy',
    offline: 'offline'
}


const agentModel = () => {
    return {
        conversationReference: null,
        id: null,
        name: null,
        status: null
    }
}

const addAgent = (conversationReference) => {
    return new Promise((resolve, reject) => {
        findAgent(conversationReference.user.id)
        .then(result => {
            if (result) {
               reject('Agente già presente');
            } else {
                const toAdd = agentModel();
                toAdd.conversationReference = conversationReference;
                toAdd.id = conversationReference.user.id;
                toAdd.name = conversationReference.user.name;
                toAdd.status = STATUS.listening;
                agents[toAdd.id] = toAdd;
                resolve(toAdd);
            }
        })
        .catch(err => reject(err));
        
    });
}

const delAgent = (conversationReference) => {
    return new Promise((resolve, reject) => {
        findAgent(conversationReference.user.id)
        .then(result => {
            if (!result) {
                reject('Agente non trovato');
            } else {
                const toDel = agents[conversationReference.user.id];
                agents[conversationReference.user.id] = undefined;
                resolve(toDel);
            }
        })
        .catch(err => reject(err));
    });
}

const findAgent = (agentId) => {
    return new Promise((resolve, reject) => {
        resolve(agents[agentId]);
    });
}



const setStatus = (agentId, status) => {
    return new Promise((resolve, reject) => {
        findAgent(agentId)
        .then(result => {
            if (result) {
                switch(status) {
                    case STATUS.offline:
                        if (result.status === STATUS.busy) {
                           return reject('Non è possibile andare in stato offline mentre si è connesso ad un utente');
                        }
                    break;
                }
                result.status = status;
                resolve(result);
            } else {
                reject('Agente non trovato');
            }
        })
        .catch(err => reject(err));
    });
}

const getAgents = (conversationReference) => {
    return new Promise((resolve, reject) => {
        resolve(Object.keys(agents).map(agentId => Object.assign({}, agents[agentId], {conversationReference: undefined})));
    });
}

const setListening = (conversationReference) => setStatus(conversationReference.user.id, STATUS.listening);
const setBusy = (conversationReference) => setStatus(conversationReference.user.id, STATUS.busy);
const setOffline = (conversationReference) => setStatus(conversationReference.user.id, STATUS.offline);
const setOnline = (conversationReference) => setStatus(conversationReference.user.id, STATUS.listening);

const me = (conversationReference) => findAgent(conversationReference.user.id);



module.exports = {
    addAgent,
    delAgent,
    findAgent,
    setListening,
    setBusy,
    setOffline,
    setOnline,
    getAgents,
    me
}