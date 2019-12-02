const Joi = require('@hapi/joi');

const connectGoogleAdsByEmailValidationSchema = Joi.object().keys({
    adWordId: Joi.string().required(),
    adsName: Joi.string()
    }
);

module.exports = {
    connectGoogleAdsByEmailValidationSchema
};
