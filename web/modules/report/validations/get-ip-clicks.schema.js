const Joi = require('@hapi/joi');

const getIpHistoryValidationSchema = Joi.object().keys({
    ip: Joi.string().ip({version: ['ipv4']}).min(1).required(),
    startDate: Joi.string()
});

module.exports = {
    getIpHistoryValidationSchema
};
