const Joi = require('@hapi/joi');

const LoginGoogleValidationSchema = Joi.object().keys({
    email: Joi.string().required().max(100).email(),
    name: Joi.string().required().min(3),
    googleId: Joi.string().required()
  }
);

module.exports = {
    LoginGoogleValidationSchema
};
