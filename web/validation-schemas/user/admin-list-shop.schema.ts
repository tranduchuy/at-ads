import Joi from '@hapi/joi';

const ListProductSchema = Joi.object().keys(
  {
    name: Joi.string(),
    limit: Joi.number().integer().min(5).max(200),
    page: Joi.number().integer().min(1),
    status: Joi.number(),
    sb: Joi.string().max(50),
    sd: Joi.string().valid('asc', 'desc'),
    startDate: Joi.string().regex(/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/),
    endDate: Joi.string().regex(/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/)
  }
);

export default ListProductSchema;