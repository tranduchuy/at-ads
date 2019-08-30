const Joi = require('@hapi/joi');

const getListGoogleAdsOfUserValidationSchema = Joi.object().keys({
    accessToken: Joi.string().required(),
    refreshToken: Joi.string().required()
});

module.exports = {
    getListGoogleAdsOfUserValidationSchema
};