const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const clicksReportSchema = new Schema({
    keywordMatchType        : { type: String, default: null },
    device                  : { type: String, default: null },
    clickType               : { type: String, default: null },
    keywordId               : { type: String, default: null },
    keyword                 : { type: String, default: null },
    adGroupId               : { type: String, default: null },
    adGroupName             : { type: String, default: null },
    campaignId              : { type: String, default: null },
    campaignName            : { type: String, default: null },
    gclId                   : { type: String, default: null },
    lopRegionCriteriaId     : { type: String, default: null },
    lopMostSpecificTargetId : { type: String, default: null },
    lopCityCriteriaId       : { type: String, default: null },
    lopCountryCriteriaId    : { type: String, default: null },
    dateOfTakingReport      : { type: Date  , default: null }
}, { timestamps: true });

const clicksReportModel = mongoose.model('ClicksReport', clicksReportSchema, 'ClicksReport');
module.exports = clicksReportModel;
module.exports.Model = clicksReportSchema;

