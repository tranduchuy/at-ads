const Joi = require('@hapi/joi');

const sampleBlockingIpValidationSchema = Joi.object().keys({
    ip: Joi.string().ip({version: ['ipv4']}).required(),
});

module.exports = {
    sampleBlockingIpValidationSchema
};