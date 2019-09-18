const Joi = require('@hapi/joi');

const getAccountsListForAdminPageValidationSchema = Joi.object().keys({
    userId: Joi.string().min(1),
    limit: Joi.number().min(1),
    page: Joi.number().min(1)
});

module.exports = {
    getAccountsListForAdminPageValidationSchema
};