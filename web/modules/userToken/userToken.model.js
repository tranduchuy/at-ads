const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const userTokenSchema = new Schema({
    userId: ObjectId,
    token: String,
    expiredAt: {type: Date, default: new Date()},
}, { timestamps: true });

const userTokenModel = mongoose.model('userToken', userTokenSchema, 'userToken');
module.exports = userTokenModel;
module.exports.Model = userTokenSchema;

