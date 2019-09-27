const BaseJoi = require('@hapi/joi');
const Extension = require('@hapi/joi-date');
const Joi = BaseJoi.extend(Extension);

const statisticsOfGoogleErrorsAndNumberOfRequestsSchemaValidation = Joi.object().keys({
    from: Joi.date().format('DD-MM-YYYY').required(),
    to: Joi.date().format('DD-MM-YYYY').required()
});

module.exports = {
    statisticsOfGoogleErrorsAndNumberOfRequestsSchemaValidation
};