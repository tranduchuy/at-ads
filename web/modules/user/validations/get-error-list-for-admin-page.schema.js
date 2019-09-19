const Joi = require('@hapi/joi');

const getErrorListForAdminPageValidationSchema = Joi.object().keys({
    limit: Joi.number().min(1),
    page: Joi.number().min(1)
});

module.exports = {
    getErrorListForAdminPageValidationSchema
};