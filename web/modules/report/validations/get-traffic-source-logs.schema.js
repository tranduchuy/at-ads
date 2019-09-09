const BaseJoi = require('@hapi/joi');
const Extension = require('@hapi/joi-date');
const Joi = BaseJoi.extend(Extension);

const getTrafficSourceLogsValidationSchema = Joi.object().keys({
    from: Joi.date().format('DD-MM-YYYY').required(),
    to: Joi.date().format('DD-MM-YYYY').required(),
    page: BaseJoi.number().min(1),
    limit: BaseJoi.number().min(1)
});

module.exports = {
    getTrafficSourceLogsValidationSchema
};