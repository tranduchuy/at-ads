import Joi from '@hapi/joi';

const CheckDate = Joi.object().keys(
  {
    startDate: Joi.string().regex(/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/),
    endDate: Joi.string().regex(/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/)
  }
);

export default CheckDate;