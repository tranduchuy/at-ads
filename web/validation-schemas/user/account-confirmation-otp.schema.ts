import Joi from '@hapi/joi';

const AccountConfirmationOTP = Joi.object().keys(
  {
    otp: Joi.number().required(),
    phone: Joi.string().required().min(10).max(11).regex(/^[0-9]*$/)
  }
);

export default AccountConfirmationOTP;