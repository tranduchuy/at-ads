const Joi = require('@hapi/joi');

const getReportForAccountValidationSchema = Joi.object().keys({
    // from: Joi.date().format('YYYY-MM-DD').required(),
    // to: Joi.date().format('YYYY-MM-DD').required()
});

module.exports = {
    getReportForAccountValidationSchema
};