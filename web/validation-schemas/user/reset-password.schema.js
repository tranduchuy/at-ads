const Joi = require('@hapi/joi');

const ResetPasswordValidationSchema = Joi.object().keys({
      token: Joi.string().required().max(50),
      password: Joi.string().required().min(6).regex(/^[a-zA-Z0-9]*$/),
      confirmedPassword: Joi.string().required().min(6).regex(/^[a-zA-Z0-9]*$/)
    }
);

module.exports = {
    ResetPasswordValidationSchema
};
