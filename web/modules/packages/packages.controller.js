const HttpStatus = require('http-status-codes');
const PackageModel = require('./packages.model');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const PackageServices = require('./packages.service');

const getListPackages = async (req, res, next) => {
	logger.info('PackageController::getListPackages::called');
	try {
		let packages = await PackageModel.find().lean();
		packages = PackageServices.sortPackage(packages);

		logger.info('PackageController::getListPackages::success');
		return res.status(HttpStatus.OK).json({
			messages: ['Thành công'],
			data: {
				packages
			}
		});
	} catch (e) {
		logger.error('PackageController::getListPackages::error', e);
		return next(e);
	}
};

module.exports = {
	getListPackages
};
