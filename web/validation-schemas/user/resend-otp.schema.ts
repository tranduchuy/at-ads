import Joi from '@hapi/joi';

const ResendOTPSchema = Joi.object().keys(
  {
    phone: Joi.string().required().min(10).max(11).regex(/^[0-9]*$/)
  }
);

export default ResendOTPSchema;