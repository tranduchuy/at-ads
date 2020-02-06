const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');

const OrderModel = require('../order/order.model');
const UserModel = require('../user/user.model');
const PackagesModel = require('../packages/packages.model');

const getOrderList = async (status, code, limit, page) => {
  logger.info('AdminOrderService::getOrderList::is called', {
    status,
    limit,
    page
  });
  try {
    let matchStage = {
      $match: {}
    };

    if (status) {
      matchStage.$match['status'] = status;
    }

    if (code) {
      matchStage.$match['code'] = {
        $regex: code,
        $options: 'g'
      };
    }

    const sortStage =  {
			$sort: {
				'createdAt': -1
			}
		};

    const facetStage = {
      $facet: {
        entries: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        meta: [{ $group: { _id: null, totalItems: { $sum: 1 } } }]
      }
    };

    const query = status || code ? [matchStage, sortStage, facetStage] : [sortStage, facetStage];
    console.log(query);
    logger.info(
      'AdminOrderService::getOrderList::query',
      JSON.stringify(query)
    );

    return await OrderModel.aggregate(query);
  } catch (e) {
    logger.error('AdminOrderService::getOrderList::error', e);
    throw e;
  }
};

const mapPackageAndUserIntoOrder = async (entries, packageIds, userIds) => {
  logger.info('AdminOrderService::mapPackageAndUserIntoOrder::is called');
  try {
    const packagesInfo = await PackagesModel.find({ _id: { $in: packageIds } });
    const usersInfo = await UserModel.find({ _id: { $in: userIds } });

    return entries.map(order => {
      const package = packagesInfo.filter(
        package => package._id.toString() == order.packageId.toString()
      );
      const user = usersInfo
        .filter(user => user._id.toString() == order.userId.toString())
        .map(mapUser);
      order.packageId = package.length > 0 ? package[0] : order.packageId;
      order.userId = user.length > 0 ? user[0] : order.userId;
      return order;
    });
  } catch (e) {
    logger.error('AdminOrderService::mapPackageAndUserIntoOrder::error', e);
    throw e;
  }
};

const mapUser = user => {
  return {
    _id: user._id,
    role: user.role,
    phone: user.phone,
    email: user.email,
    name: user.name,
    avatar: user.avatar
  };
};

module.exports = {
  getOrderList,
  mapPackageAndUserIntoOrder
};
