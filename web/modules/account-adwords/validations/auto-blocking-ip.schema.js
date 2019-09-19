const Joi = require('@hapi/joi');

const AutoBlockingIpValidationSchema = Joi.object().keys({
    maxClick: Joi.number().min(-1).required(),
    autoRemove: Joi.boolean().required(),
    autoBlockWithAiAndBigData: Joi.boolean().required(),
    countMaxClickInHours: Joi.number().min(1).required()
});

module.exports = {
    AutoBlockingIpValidationSchema
};
