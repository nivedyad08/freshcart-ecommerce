require('dotenv').config()

const client = require('twilio')(process.env.accountSid, process.env.authToken, {
    logLevel: 'debug'
});

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000);
}

module.exports = {
    client,
    generateOTP
}