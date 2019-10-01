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

module.exports = {
	createLogError
};
