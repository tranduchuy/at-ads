const Joi = require('@hapi/joi');

const RegisterValidationSchema = Joi.object().keys({
    email: Joi.string().required().max(100).email(),
    password: Joi.string().required().min(6).regex(/^[a-zA-Z0-9]*$/),
    confirmedPassword: Joi.string().required().min(6).regex(/^[a-zA-Z0-9]*$/),
    name: Joi.string().required().min(3)
  }
);

module.exports = {
  RegisterValidationSchema
};

