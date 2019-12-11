const Joi = require('@hapi/joi');

const AutoBlockingRangeIpValidationSchema = Joi.object().keys({
    classC: Joi.boolean().required(),
    classD: Joi.boolean().required(),
    countMaxClickClassCInMinnutes: Joi.number().min(1).max(120).required(),
    countMaxClickClassDInMinnutes: Joi.number().min(1).max(120).required(),
    autoBlockIpClassCByMaxClick: Joi.number().min(1).max(200).required(),
    autoBlockIpClassDByMaxClick: Joi.number().min(1).max(500).required(),
});

module.exports = {
    AutoBlockingRangeIpValidationSchema
};
