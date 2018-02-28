'use strict';

const sprintf = require('sprintf').sprintf;
const prefix = '#!';

const createCmd = (cmdset) => {
    return {
        label: cmdset[0],
        description: cmdset[1],
        successMsg: cmdset[2],
        failureMsg: cmdset[3]
    }
}

const CMDS = {
    login: createCmd(['login', 'Comando di login', 'Benvenuto %(name)s', 'Si è verificato un errore: %s']),
    logout: createCmd(['logout', 'Comando di logout', 'Arrivederci %(name)s', 'Si è verificato un errore: %s']),
    end: createCmd(['end', 'Termina conversazione', 'Hai terminato la conversazione', 'Si è verificato un errore: %s']),
    offline: createCmd(['offline', 'Imposta stato come non disponibile', 'Ok %(name)s, torna presto!', 'Si è verificato un errore: %s']),
    online: createCmd(['online', 'Imposta stato come disponibile', 'Bentornato %(name)s!', 'Si è verificato un errore: %s']),
    me: createCmd(['me', 'Visualizza il tuo stato', '%s', 'Si è verificato un errore: %s']),
    agents: createCmd(['agents', 'Visualizza la lista degli agenti', '%s', 'Si è verificato un errore: %s']),
    help: createCmd(['help', 'Tu sei qui', '%s', 'Si è verificato un errore: %s'])
}

const parseCmd = (msg) => {
    const response = {
        isCommand: false,
        cmdString: null,
        command: null
    }
    if (msg.indexOf(prefix) === 0) {
        const cmd = msg.substr(prefix.length);
        response.isCommand = true;
        response.cmdString = cmd;
        const cmdKey = Object.keys(CMDS).find(cmdKey => CMDS[cmdKey].label === cmd);
        response.command = cmdKey?CMDS[cmdKey]:null;
    }
    return response;
}

const receiveActivity = (context, next) => {
    if (context.request.type === 'message') {
        const message = context.request.text || '';
        const command = parseCmd(message);
        if (command.isCommand) 
        {
          context.state.conversation.command = command;
        }
    }
    next();
}

const postActivity = (context, activities, next) => {
    context.state.conversation.command = undefined;
}

module.exports = {
    receiveActivity
}