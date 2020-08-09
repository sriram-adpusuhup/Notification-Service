const jwt = require('jsonwebtoken');
const config = require('./../../configs/config');

const API = {
    decodeAuthToken: token => jwt.verify(token, config.JWT.SALT),
    isValidToken: token => {
        if (!token || !token.length) return false;
        try {
            const decoded = API.decodeAuthToken(token);
            console.log({decoded});
            return decoded && decoded.email;
        } catch(err) {
            console.error(err);
            return false;
        }
    }
};

module.exports = API;