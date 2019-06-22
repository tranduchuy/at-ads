import Joi from '@hapi/joi';
import { Status } from '../../constant/status';

const CheckUpdateStatusProducts = Joi.object().keys(
  {
    productIds: Joi.array().items(Joi.string()).required().min(1),
    status: Joi.number().valid([Status.PRODUCT_HIDDEN, Status.ACTIVE, Status.DELETE])
  }
);

export default CheckUpdateStatusProducts;