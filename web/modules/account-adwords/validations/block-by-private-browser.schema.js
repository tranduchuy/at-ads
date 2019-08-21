const Joi = require('@hapi/joi');

const BlockByPrivateBrowserValidationSchema = Joi.object().keys({
    blockByPrivate: Joi.boolean().required()
});

module.exports = {
    BlockByPrivateBrowserValidationSchema
};
