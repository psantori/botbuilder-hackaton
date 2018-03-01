'use strict';

const model = () => ({
    done: false,
    response: null
});

const doIt = (context) => {
    console.log("booking service start");
    return new Promise((resolve, reject) => {
        let result = model();
        result.done = true;
        result.response = "Ottimo";
        return resolve(result);
    }); 
}

module.exports = {
    doIt
}