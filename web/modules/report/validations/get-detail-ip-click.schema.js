const Joi = require('@hapi/joi');

const getDetailIpClickValidationSchema = Joi.object().keys({
    startTime: Joi.string(),
    endTime: Joi.string().required(),
});

module.exports = {
    getDetailIpClickValidationSchema
};
