import Joi from '@hapi/joi';

const ListUserSchema = Joi.object().keys(
  {
    username: Joi.string(),
    email: Joi.string().email(),
    role: Joi.number(),
    limit: Joi.number().integer().min(5).max(200),
    page: Joi.number().integer().min(1),
    sb: Joi.string().max(50),
    sd: Joi.string().valid('asc', 'desc'),
    user_id: Joi.string()
  }
);

export default ListUserSchema;