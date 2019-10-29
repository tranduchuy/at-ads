const Joi = require('@hapi/joi');

const UpdateLimitWebsiteValidationSchema = Joi.object().keys({
    accountId: Joi.string().required(),
    limitWebsite: Joi.number().min(1).required()
});

module.exports = {
    UpdateLimitWebsiteValidationSchema
};