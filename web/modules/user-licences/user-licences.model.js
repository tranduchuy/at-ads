const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const UserLicencesService = require('./user-licences.service');

const userLicencesSchema = new Schema(
  {
    userId: { type: ObjectId, default: null },
    packageId: { type: ObjectId, default: null },
    histories: { type: Object, default: null },
    limitGoogleAd: { type: Number, default: 1 },
    expiredAt: { type: Date, default: null }
  },
  { timestamps: true }
);

const userLicencesModel = mongoose.model(
  'UserLicences',
  userLicencesSchema,
  'UserLicences'
);

UserLicencesService.verifyThatTheUserHasUserLicences(userLicencesModel);

module.exports = userLicencesModel;
module.exports.Model = userLicencesSchema;
