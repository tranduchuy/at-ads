const Joi = require('@hapi/joi');

const getDailyClickingValidationSchema = Joi.object().keys({
    page: Joi.number().min(1),
    limit: Joi.number().min(1),
    from: Joi.number().min(1).required(),
    to: Joi.number().min(1).required(),
});

module.exports = {
    getDailyClickingValidationSchema
};