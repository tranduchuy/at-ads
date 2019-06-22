/**
 * Created by duong_000 on 10/18/2016.
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const accountSchema = new Schema({
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'Users'
    },
    promo: {type: Number, default: 0},
    main: {type: Number, default: 0},
    date: {type: Number, default: Date.now}
});

const AccountModel = mongoose.model('Account', accountSchema, 'Accounts');
module.exports = AccountModel;
module.exports.Model = accountSchema;
