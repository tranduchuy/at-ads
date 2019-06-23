const Joi = require('@hapi/joi');
const ResendConfirm = Joi.object().keys(
  {
    email: Joi.string().required().max(100).email()
  }
);

module.exports = {
    ResendConfirm
};