const Joi = require('@hapi/joi');

const getIpHistoryValidationSchema = Joi.object().keys({
    page: Joi.number().min(1),
    limit: Joi.number().min(1),
    ip: Joi.string().ip({version: ['ipv4']}).min(1).required()
});

module.exports = {
    getIpHistoryValidationSchema
};