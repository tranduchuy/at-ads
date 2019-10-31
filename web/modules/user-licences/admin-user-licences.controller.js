const mongoose = require('mongoose');
const HttpStatus = require('http-status-codes');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const Joi = require('@hapi/joi');
const moment = require('moment');

const requestUtil = require('../../utils/RequestUtil');
const UserLicencesModel = require('./user-licences.model');
const PackageModel = require('../packages/packages.model');
const OrderService = require('../order/order.service');
const OrderModel = require('../order/order.model');
const OrderConstant = require('../order/order.constant');
const AdminUserLicencesService = require('./admin-user-licences.service');

const {
  UpdatePackageForUserValidationSchema
} = require('./validations/update-package-for-user.schema');

const updatePackageForUser = async (req, res, next) => {
  logger.info(
    'AdminUserLicencesController::updatePackageForUserLicence::Is called',
    { packageId: req.body.packageId, userId: req.body.userId }
  );
  try {
    const { error } = Joi.validate(
      req.body,
      UpdatePackageForUserValidationSchema
    );

    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    const { userId, packageId } = req.body;
    const expiredAtOfUserLicence = req.body.expiredAt
      ? moment(req.body.expiredAt, 'DD-MM-YYYY').endOf('day')
      : null;

    if (expiredAtOfUserLicence && expiredAtOfUserLicence.isBefore(moment())) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        messages: [
          `Ngày gửi lên: ${expiredAtOfUserLicence.format(
            'DD-MM-YYYY'
          )} đang nhỏ hơn ngày hiện tại: ${moment().format('DD-MM-YYYY')}`
        ]
      });
    }

    const userLicences = await UserLicencesModel.findOne({
      userId: mongoose.Types.ObjectId(userId)
    }).populate('packageId');

    if (!userLicences) {
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: ['Không tìm thấy user.']
      });
    }

    const package = await PackageModel.findOne({
      _id: mongoose.Types.ObjectId(packageId)
    });

    if (!package) {
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: ['Không tìm thấy package.']
      });
    }

    let history = userLicences.histories || [];
    history.push({
      packageId: package._id,
      name: package.name,
      type: package.type,
      price: package.price,
      createdAt: new Date()
    });
    const expiredAt = AdminUserLicencesService.filterExpiredAt({
      userLicences,
      package,
      expiredAtOfUserLicence
    });

    userLicences.histories = history;
    userLicences.expiredAt = expiredAt;
    userLicences.packageId = package._id;
    await userLicences.save();
    const code = await OrderService.createCode();
    const newOrder = new OrderModel({
      userId,
      packageId: package._id,
      code,
      status: OrderConstant.status.SUCCESS
    });
    await newOrder.save();

    return res.status(HttpStatus.OK).json({
      messages: ['Cập nhật thành công'],
      data: userLicences
    });
  } catch (e) {
    logger.error(
      'AdminUserLicencesController::updatePackageForUserLicence::Error',
      e
    );
    next(e);
  }
};

module.exports = {
  updatePackageForUser
};
