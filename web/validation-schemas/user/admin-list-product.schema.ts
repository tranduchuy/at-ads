import Joi from '@hapi/joi';
import { Status } from '../../constant/status';

const ListProductSchema = Joi.object().keys(
  {
    shop_id: Joi.string(),
    limit: Joi.number().integer().min(5).max(200),
    page: Joi.number().integer().min(1),
    title: Joi.string(),
    sku: Joi.string().regex(/^[a-zA-Z0-9]*$/),
    maxPrice: Joi.number().min(0),
    minPrice: Joi.number().min(0),
    saleOff: Joi.boolean(),
    status: Joi.number().valid([Status.ACTIVE, Status.DELETE , Status.PRODUCT_HIDDEN]),
    sb: Joi.string().max(50),
    sd: Joi.string().valid('asc', 'desc')
  }
);

export default ListProductSchema;