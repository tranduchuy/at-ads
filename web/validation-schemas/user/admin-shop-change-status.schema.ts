import Joi from '@hapi/joi';
import { Status } from '../../constant/status';

const AdminShopChangeStatus = Joi.object().keys(
  {
    shopId: Joi.string().required(),
    status: Joi.number().valid([Status.ACTIVE, Status.BLOCKED]).required(),
  }
);

export default AdminShopChangeStatus;