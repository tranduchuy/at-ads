const Joi = require('@hapi/joi');

const getDailyClickingValidationSchema = Joi.object().keys({
    page: Joi.number().min(1),
    limit: Joi.number().min(1)
});

module.exports = {
    getDailyClickingValidationSchema
};