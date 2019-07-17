const Joi = require('@hapi/joi');

const AutoBlockingDevicesValidationSchema = Joi.object().keys({
    mobile: Joi.boolean().required(),
    tablet: Joi.boolean().required(),
    pc: Joi.boolean().required()
});

module.exports = {
    AutoBlockingDevicesValidationSchema
};
