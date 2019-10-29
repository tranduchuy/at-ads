const Joi = require('@hapi/joi');

const UpdateLimitGoogleAdValidationSchema = Joi.object().keys({
  userId: Joi.string().required(),
  limitGoogleAd: Joi.number().min(1).required()
});

module.exports = {
  UpdateLimitGoogleAdValidationSchema
};
