const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;

const googleAdsErrorsSchema = new Schema({
	moduleName: String,
	serviceName: String,
	serviceVersion: String,
	authConfig: Object,
	params: Object,
	error: Object,
	functionName: String
}, { timestamps: true });

const googleAdsErrorsModel = mongoose.model('GoogleAdsErrors', googleAdsErrorsSchema, 'GoogleAdsErrors');
module.exports = googleAdsErrorsModel;
module.exports.Model = googleAdsErrorsSchema;

