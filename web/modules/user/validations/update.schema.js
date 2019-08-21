const Joi = require('@hapi/joi');

const UpdateValidationSchema = Joi.object().keys({
    password: Joi.string().min(6).regex(/^[a-zA-Z0-9]*$/),
    confirmedPassword: Joi.string().min(6).regex(/^[a-zA-Z0-9]*$/),
    oldPassword: Joi.string().min(6).regex(/^[a-zA-Z0-9]*$/),
    name: Joi.string().min(3),
    phone: Joi.number().integer().min(10)
  }
);

module.exports = {
  UpdateValidationSchema
};

