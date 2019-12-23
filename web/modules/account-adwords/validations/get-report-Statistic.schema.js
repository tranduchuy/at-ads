const Joi = require('@hapi/joi');
const pattern = /^([+ - -])(0[0-9]|1[0-4]):([0-5][0-9])$/;

const getReportStatisticValidationSchema = Joi.object().keys({
    from: Joi.number().min(1).required(),
    to: Joi.number().min(1).required(),
    timeZone: Joi.string().regex(pattern).required(),
    website: Joi.string()
});

module.exports = {
    getReportStatisticValidationSchema
};