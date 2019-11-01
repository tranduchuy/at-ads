const Joi = require('@hapi/joi');

const getTrafficSourceStatisticByDayValidationSchema = Joi.object().keys({
    from: Joi.number().min(1).required(),
    to: Joi.number().min(1).required(),
    website: Joi.string()
});

module.exports = {
    getTrafficSourceStatisticByDayValidationSchema
};