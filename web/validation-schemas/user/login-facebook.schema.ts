import Joi from '@hapi/joi';

const LoginFacebookValidationSchema = Joi.object().keys({
    token: Joi.string().required(),
  }
);

export default LoginFacebookValidationSchema;