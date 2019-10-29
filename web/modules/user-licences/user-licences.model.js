const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;

const userLicencesSchema = new Schema(
  {
    userId: { type: ObjectId, default: null, ref: 'User' },
    packageId: { type: ObjectId, default: null, ref: 'Package' },
    histories: { type: [Object], default: null },
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

module.exports = userLicencesModel;
module.exports.Model = userLicencesSchema;
