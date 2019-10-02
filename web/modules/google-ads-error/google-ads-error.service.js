const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const GoogleAdsErrorModel = require('./google-ads-error.model');

/**
 * create new log when call api google error
 * @param {{authConfig: Object, params: Object, error: Object, functionName: string, serviceName: string,
 *   serviceVersion: string, moduleName: String}} data
 * @return {Promise<*>}
 */
const createLogError = async (data) => {
	console.log(data);
	const error = data.error;
	let exceptionType, errorString, reason;

	try {
		if (error.root) {
			exceptionType = error.root.Envelope.Body.Fault.detail.ApiExceptionFault["ApplicationException.Type"];
			errorString = error.root.Envelope.Body.Fault.detail.ApiExceptionFault.errors.errorString;
			reason = error.root.Envelope.Body.Fault.detail.ApiExceptionFault.errors.reason;
		} else {
			exceptionType = null;
			errorString = null;
			reason = null;
		}
	} catch (e) {
		// No need to log
	}

	const newError = new GoogleAdsErrorModel({
		authConfig: data.authConfig,
		params: data.params,
		error: JSON.stringify(data.error),
		functionName: data.functionName,
		serviceVersion: data.serviceVersion,
		serviceName: data.serviceName || '',
		moduleName: data.moduleName || '',
		exceptionType,
		errorString,
		reason
	});

	return await newError.save();
};

const getErrorListForAdminPage = (page, limit) => {
	return new Promise(async (res, rej) => {
		logger.info('GoogleAdsErrorService::getErrorListForAdminPage::is Called', { page, limit });
		try {
			const sortStage = {
				$sort: {
					createdAt: -1
				}
			};

			const facetStage = {
				$facet:
					{
						entries: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit }
						],
						meta: [
							{ $group: { _id: null, totalItems: { $sum: 1 } } },
						],
					}
			};

			const query = [sortStage, facetStage];

			const errorList = await GoogleAdsErrorModel.aggregate(query);

			logger.info('GoogleAdsErrorService::getErrorListForAdminPage::query\n', JSON.stringify(query));

			return res(errorList);
		} catch (e) {
			logger.error('GoogleAdsErrorService::getErrorListForAdminPage::error\n', e);
			return rej(e);
		}
	});
};

const statisticError = async () => {
	return await GoogleAdsErrorModel.aggregate([
		{
			$group: {
				_id: "$reason",
				count: {
					$sum: 1
				}
			}
		}
	]);
};

module.exports = {
	createLogError,
	getErrorListForAdminPage,
	statisticError
};
