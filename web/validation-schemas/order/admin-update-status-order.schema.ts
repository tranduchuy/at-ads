import Joi from '@hapi/joi';
import { Status } from '../../constant/status';

const AdminUpdateOrderStatusValidationSchema = Joi.object().keys({
      status: Joi.number().required().valid([
        Status.ORDER_NOT_YET_PAID,
        Status.ORDER_PAID,
        Status.ORDER_CANCEL
      ])
    }
);

export default AdminUpdateOrderStatusValidationSchema;