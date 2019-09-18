const GoogleAdsErrorModel = require('./google-ads-error.model');

/**
 * create new log when call api google error
 * @param {{authConfig: Object, params: Object, error: Object, functionName: string, serviceName: string, serviceVersion: string, moduleName: String}} data
 * @return {Promise<*>}
 */
const createLogError = async (data) => {
	console.log(data);
	const newError = new GoogleAdsErrorModel({
		authConfig: data.authConfig,
		params: data.params,
		error: JSON.stringify(data.error),
		functionName: data.functionName,
		serviceVersion: data.serviceVersion,
		serviceName: data.serviceName || '',
		moduleName: data.moduleName || ''
	});

	return await newError.save();
};

module.exports = {
	createLogError
};
