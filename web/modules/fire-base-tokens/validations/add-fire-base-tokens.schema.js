const Joi = require('@hapi/joi');

const addFireBaseTokensValidationSchema = Joi.object().keys({
    fireBaseToken: Joi.string().required()
});

module.exports = {
    addFireBaseTokensValidationSchema
};
