const Joi = require('@hapi/joi');

const ForgetPasswordValidationSchema = Joi.object().keys({
      email: Joi.string().required().max(100).email()
    }
);

module.exports = {
    ForgetPasswordValidationSchema
};