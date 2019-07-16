const Joi = require('@hapi/joi');

const blockIpsValidationSchema = Joi.object().keys({
    action: Joi.valid(['ADD', 'REMOVE']).required(),
    ips: Joi.array().items(Joi.string().ip({version: ['ipv4']})).min(1).required(),
});

module.exports = {
    blockIpsValidationSchema
};
