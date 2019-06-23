const Joi = require('@hapi/joi');

const LoginValidationSchema = Joi.object().keys({
    email: Joi.string().max(100),
    username: Joi.string().min(6).max(100).regex(/^[a-zA-Z0-9]*$/),
    password: Joi.string().min(6).max(100).regex(/^[a-zA-Z0-9]*$/)
  }
);

module.exports = {
    LoginValidationSchema
};
