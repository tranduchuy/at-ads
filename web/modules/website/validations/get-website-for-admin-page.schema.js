const Joi = require('@hapi/joi');

const validateObj = Joi.object().keys({
    adsId: Joi.string().min(1),
    email: Joi.string().min(1),
    limit: Joi.number().min(1),
    page: Joi.number().min(1)
});

module.exports = validateObj;