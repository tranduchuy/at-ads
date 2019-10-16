const Joi = require('@hapi/joi');

const getUsersListForAdminPageValidationSchema = Joi.object().keys({
  email: Joi.string().min(1),
  name: Joi.string().min(1),
  limit: Joi.number().min(1),
  page: Joi.number().min(1)
});

module.exports = {
  getUsersListForAdminPageValidationSchema
};
