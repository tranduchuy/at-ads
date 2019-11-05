const Joi = require('@hapi/joi');

const UpdateOrderValidationSchema = Joi.object().keys({
  code: Joi.string().required()
});

module.exports = {
  UpdateOrderValidationSchema
};
