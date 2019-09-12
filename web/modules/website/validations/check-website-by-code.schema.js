const Joi = require('@hapi/joi');

const checkWebsiteByCodeValidationSchema = Joi.object().keys({
    code: Joi.string().required()
  }
);

module.exports = {
    checkWebsiteByCodeValidationSchema
};
