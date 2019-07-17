const Joi = require('@hapi/joi');

const AutoBlocking3g4gValidationSchema = Joi.object().keys({
    viettel: Joi.boolean().required(),
    mobifone: Joi.boolean().required(),
    vinafone: Joi.boolean().required(),
    vietnammobile: Joi.boolean().required()
});

module.exports = {
    AutoBlocking3g4gValidationSchema
};
