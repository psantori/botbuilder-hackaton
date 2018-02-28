'use strict';
const { LuisRecognizer } = require('botbuilder-ai');
const crypto = require('crypto');
const hash = crypto.createHash('sha256');

// hash.update('some data to hash');
// console.log(hash.digest('hex'));
let cache = {};

const luis = new LuisRecognizer(process.env.LUIS_APP_ID, process.env.LUIS_SUBSCRIPTION_KEY);

const setCache = (key, cacheValue) => {
    return new Promise((resolve, reject) => {
        getCache(key)
        .then(result => {
            if (!result) {
                hash.update(key);
                const cacheKey = hash.digest('hex');
                cache[cacheKey] = cacheValue;
                return cacheValue;
            }
            return result;
        })
        .then(result => resolve(result))
        .catch(err => reject(err));
    });
}

const getCache = (key) => {
    return new Promise((resolve, reject) => {
        hash.update(key);
        const cacheKey = hash.digest('hex');
        resolve(cache[cacheKey]);
    });
}

const clearCache = () => {
    return new Promise((resolve, reject) => {
        cache = {};
        resolve(true);
    });
}

const recognize = (message) => {
    return new Promise((resolve, reject) => {
        let response = null;
        getCache(message)
        .then(result => {
            if (result) {
                response = result;
                return response;
            } else {
                return luis.recognize(message);
            }
        })
        .then(result => {
            if (response) {
                return response;
            } else {
                return LuisRecognizer.findTopIntent(result);
            }
        })
        .then(result => setCache(message, result))
        .then(result => resolve(result))
        .catch(err => reject(err));
    });
}

module.exports = {
    clearCache,
    recognize
}
