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

const getAgentCount = () => {
    return new Promise((resolve, reject) => {
        resolve(Object.keys(agents).length);
    });
}

const addAgent = (conversationReference) => {
    return new Promise((resolve, reject) => {
        const id = conversationReference.user.id;
        let result = agents[id];
        if (!result) {
            result = agentModel();
            result.conversationReference = conversationReference;
            result.id = id;
            result.name = conversationReference.user.name;
            result.status = STATUS.listening;
            agents[id] = result;
        }
        resolve(result);
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
                --agentCounts;
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
                reject('Agent not found');
            }
        })
        .catch(err => reject(err));
    });
}

const getAgents = (conversationReference) => {
    return new Promise((resolve, reject) => {
        resolve(Object.keys(agents)
                .map(agentId => `Id: ${agents[agentId].id}, Name: ${agents[agentId].name}, Status: ${agents[agentId].status}`).join('\n\r')
            );
    });
}

const nextListeningAgent = () => {
    return new Promise((resolve, reject) => {
        const foundId = Object.keys(agents).find(agentId => agents[agentId].status === STATUS.listening);
        resolve(agents[foundId]);
    });
}

const findListeningAgents = () => {
    return new Promise((resolve, reject) => {
        const foundIds = Object.keys(agents).filter(agentId => agents[agentId].status === STATUS.listening);
        resolve(foundIds.map(agentId => agents[agentId]));
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
    nextListeningAgent,
    findListeningAgents,
    setListening,
    setBusy,
    setOffline,
    setOnline,
    getAgents,
    getAgentCount,
    me
}