const Joi = require('@hapi/joi');

const getIpsInAutoBlackListOfAccountValidationSchema = Joi.object().keys({
    page: Joi.number().min(1),
    limit: Joi.number().min(1)
});

module.exports = {
    getIpsInAutoBlackListOfAccountValidationSchema
};