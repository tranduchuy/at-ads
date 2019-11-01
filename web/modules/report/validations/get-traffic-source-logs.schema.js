const Joi = require('@hapi/joi');

const getTrafficSourceLogsValidationSchema = Joi.object().keys({
    from: Joi.number().min(1).required(),
    to: Joi.number().min(1).required(),
    page: Joi.number().min(1),
    limit: Joi.number().min(1),
    website: Joi.string()
});

module.exports = {
    getTrafficSourceLogsValidationSchema
};