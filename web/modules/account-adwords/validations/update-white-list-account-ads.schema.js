const Joi = require('@hapi/joi');

const UpdateWhiteListIpsValidationSchema = Joi.object().keys({
    ips: Joi.array().items(Joi.string().ip({version: ['ipv4']})).required(),
});

module.exports = {
    UpdateWhiteListIpsValidationSchema
};
