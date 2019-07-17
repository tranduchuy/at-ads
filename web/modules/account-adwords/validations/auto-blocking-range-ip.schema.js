const Joi = require('@hapi/joi');

const AutoBlockingRangeIpValidationSchema = Joi.object().keys({
    classC: Joi.boolean().required(),
    classD: Joi.boolean().required()
});

module.exports = {
    AutoBlockingRangeIpValidationSchema
};
