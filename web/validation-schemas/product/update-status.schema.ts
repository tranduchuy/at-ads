import Joi from '@hapi/joi';
import { Status } from '../../constant/status';

const UpdateStatusValidationSchema = Joi.object().keys({
    productIds: Joi.array().required().items(Joi.string()).min(1),
    status: Joi.number().required().valid([
      Status.ACTIVE,
      Status.DELETE,
      Status.PRODUCT_HIDDEN
    ])
  }
);

export default UpdateStatusValidationSchema;