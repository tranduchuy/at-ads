const Joi = require('@hapi/joi');

const DeleteDomainValidationSchema = Joi.object().keys({
    code: Joi.string().required()
  }
);

module.exports = {
  DeleteDomainValidationSchema
};
