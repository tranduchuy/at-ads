const Joi = require('@hapi/joi');

const removeIpInAutoBlackListValidationSchema = Joi.object().keys({
    ips: Joi.array().items(Joi.string().ip({version: ['ipv4']})).min(1).required(),
});

module.exports = {
    removeIpInAutoBlackListValidationSchema
};
