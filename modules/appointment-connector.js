'use strict';
const fetch = require('node-fetch');
const fs = require('fs');

const baseUrl = 'http://fff27279.ngrok.io/';
const endpoint = 'bookings/'
let mockAppointments = [];

const model = () => {
    return {
        date: null,
        store: null,
        user: null,
        agent: null
    }
}

const responseModel = () => {
    return {
        success: false,
        error: null,
        data: null
    };
}

const loadData = () => {
    const data = fs.readFileSync('data/appointments.json', 'utf8');
    let result = null;
    try {
        result = JSON.parse(data);
    } catch (e) {
        //return reject(e);
    }
    return result;
}

const init = () => {
    mockAppointments = loadData();
}
 
const fetchData = (url, options) => {
    return new Promise((resolve, reject) => {
        fetch(url, {
            method: options.method || 'GET',
            body: options.body,
            headers: {
                "Content-type": 'application/json'
            }
        })
        .then(result => result.json())
        .then(result => resolve(result))
        .catch(err => reject(err));
    });
}

const filterAppointments = (options) => {
    return new Promise((resolve, reject) => {
        const response = mockAppointments.filter(apmt => {
            let filterPass = true;
            if (filterPass && options.dateFrom) {
                const dateFrom = new Date(options.dateFrom);
                filterPass = (new Date(apmt.date)).getTime() >= dateFrom.getTime();
            }
            if (filterPass && options.dateTo) {
                const dateTo = new Date(options.dateTo);
                filterPass = (new Date(apmt.date)).getTime() >= dateTo.getTime();                
            }
            if (filterPass && options.storeId) {
                filterPass = apmt.storeId === options.storeId;
            }
            if (filterPass && options.userId) {
                filterPass = apmt.userId === options.userId;
            }
            if (filterPass && options.agentId) {
                filterPass = apmt.agentId === options.agentId;
            }
            return filterPass;
        });
        resolve(response);
    });
}

const getAppointments = (options) => {
    return new Promise((resolve, reject) => {
        // api call
        const response = responseModel();
        fetchData(`${baseUrl}${endpoint}?${Object.keys(options).map(key => key + '=' + options[key]).join('&')}`, {
            method: 'GET'
        })
        .then(result => {
            response.success = true;
            response.data = result;
            return response;
        })
        .catch(err => {
            response.success = false;
            response.error = err;
            return response;
        })
        .then(result => resolve(response))
        .catch(err => reject(err));
        // response.success = true;
        // response.data = filterAppointments(options);
        // resolve(response);
    });
}

const setAppointment = (appointment) => {
    return new Promise((resolve, reject) => {

        if (!appointment || !appointment.date || !appointment.storeId || !appointment.userId) {
            return reject('Missing informations');
        }
        // api POST call
        // mockAppointments.push(appointment);
        const response = responseModel();
        fetchData(`${baseUrl}${endpoint}`, {
            method: 'POST',
            body: JSON.stringify(appointment)
        })
        .then(result => {
            response.success = true;
            response.data = result;
            return response;
        })
        .catch(err => {
            response.success = false;
            response.error = err;
            return response;
        })
        .then(result => resolve(response))
        .catch(err => reject(err));
        // response.success = true;
        // response.data = appointment;
        // resolve(response);
    });
}

const deleteAppointment = (appointmentId) => {
    return new Promise((resolve, reject) => {
        const response = responseModel();
        fetchData(`${baseUrl}${endpoint}${appointmentId}`, {
            method: 'DELETE'
        })
        .then(result => {
            response.success = true;
            response.data = result;
            return response;
        })
        .catch(err => {
            response.success = false;
            response.error = err;
            return response;
        })
        .then(result => resolve(response))
        .catch(err => reject(err));
    });
}

module.exports = {
    getAppointments,
    setAppointment,
    deleteAppointment
}