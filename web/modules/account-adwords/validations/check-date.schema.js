const Joi = require('@hapi/joi');

const CheckDate = Joi.object().keys(
  {
    page: Joi.number().min(1),
    limit: Joi.number().min(1),
    startDate: Joi.number().min(1),
    endDate: Joi.number().min(1)
  }
);

module.exports = {
  CheckDate
};
