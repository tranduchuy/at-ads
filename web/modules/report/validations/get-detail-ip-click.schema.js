const Joi = require('@hapi/joi');

const getDetailIpClickValidationSchema = Joi.object().keys({
    startId: Joi.string(),
    endId: Joi.string().required()
});

module.exports = {
    getDetailIpClickValidationSchema
};
