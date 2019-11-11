const Joi = require('@hapi/joi');

const getReportStatisticValidationSchema = Joi.object().keys({
    from: Joi.number().min(1).required(),
    to: Joi.number().min(1).required()
});

module.exports = {
    getReportStatisticValidationSchema
};