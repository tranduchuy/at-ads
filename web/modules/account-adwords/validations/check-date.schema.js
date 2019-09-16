const BaseJoi = require('@hapi/joi');
const Extension = require('@hapi/joi-date');
const Joi = BaseJoi.extend(Extension);

const CheckDate = Joi.object().keys(
  {
    page: Joi.number().min(1),
    limit: Joi.number().min(1),
    startDate: Joi.date().format('DD-MM-YYYY'),
    endDate: Joi.date().format('DD-MM-YYYY')
  }
);

module.exports = {
  CheckDate
};
