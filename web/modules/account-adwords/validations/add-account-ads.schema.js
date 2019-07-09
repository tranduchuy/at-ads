const Joi = require('@hapi/joi');

const AddAccountAdsValidationSchema = Joi.object().keys({
    adWordId: Joi.string().required()
    }
);

module.exports = {
    AddAccountAdsValidationSchema
};
