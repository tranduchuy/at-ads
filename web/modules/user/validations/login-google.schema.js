const Joi = require('@hapi/joi');

const LoginGoogleValidationSchema = Joi.object().keys({
    accessToken: Joi.string().required(),
    refreshToken: Joi.string()
  }
);

module.exports = LoginGoogleValidationSchema
