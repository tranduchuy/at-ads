import Joi from '@hapi/joi';
import { Status } from '../../constant/status';

const ListProductOfShopSchema = Joi.object().keys(
  {
    limit: Joi.number().max(200),
    page: Joi.number().min(1),
    title: Joi.string(),
    status: Joi.number().valid([Status.ACTIVE, Status.BLOCKED]),
    sb: Joi.string(),
    sd: Joi.string().valid(['ASC', 'DESC'])
  }
);

export default ListProductOfShopSchema;