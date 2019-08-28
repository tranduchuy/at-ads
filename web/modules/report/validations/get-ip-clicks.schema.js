const Joi = require('@hapi/joi');

const getIpClicksValidationSchema = Joi.object().keys({
    ip: Joi.string().ip({version: ['ipv4']}).min(1).required()
});

module.exports = {
    getIpClicksValidationSchema
};
