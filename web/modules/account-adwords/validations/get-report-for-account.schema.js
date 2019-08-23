const BaseJoi = require('@hapi/joi');
const Extension = require('@hapi/joi-date');
const Joi = BaseJoi.extend(Extension);

const getReportForAccountValidationSchema = Joi.object().keys({
    from: Joi.date().format('DD-MM-YYYY').required(),
    to: Joi.date().format('DD-MM-YYYY').required(),
    page: Joi.number().min(1),
    limit: Joi.number().min(1)
});

module.exports = {
    getReportForAccountValidationSchema
};