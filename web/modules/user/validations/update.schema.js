const Joi = require('@hapi/joi');

const UpdateValidationSchema = Joi.object().keys({
        password: Joi.string().min(6).regex(/^[a-zA-Z0-9]*$/),
        confirmedPassword: Joi.string().min(6).regex(/^[a-zA-Z0-9]*$/),
        oldPassword: Joi.string().min(6).regex(/^[a-zA-Z0-9]*$/),
        name: Joi.string().min(3),
        phone: Joi.number().integer().min(10),
        birthday: Joi.string().regex(/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/),
        gender: Joi.number(),
        avatar: Joi.string()
    }
);

module.exports = {
    UpdateValidationSchema
};

