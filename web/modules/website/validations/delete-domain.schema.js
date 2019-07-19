const Joi = require('@hapi/joi');

const DeleteDomainValidationSchema = Joi.object().keys({
    websiteId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
  }
);

module.exports = {
  DeleteDomainValidationSchema
};