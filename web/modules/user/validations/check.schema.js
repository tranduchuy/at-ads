const Joi = require('@hapi/joi');

const CheckValidationSchema = Joi.object().keys({
        email: Joi.string().max(100).email(),
    }
);

module.exports = {
    CheckValidationSchema
};
