/**
 * Created by duong_000 on 10/18/2016.
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const log4js = require('log4js');
const logger = log4js.getLogger('Models');

const transactionHistorySchema = new Schema({
    userId: {type: Schema.Types.ObjectId, ref: 'User'},
    adminId: {type: Schema.Types.ObjectId, ref: 'User'},
    amount: Number,
    note: String,
    info: String,// receiver or sender or sale
    type: Number,
    before: {
        type: Object,
        default: {
            credit: 0,
            main: 0,
            promo: 0
        }
    },
    after: {
        type: Object,
        default: {
            credit: 0,
            main: 0,
            promo: 0
        }
    },
    date: {type: Number, default: Date.now}
});


const TransactionHistory = mongoose.model('TransactionHistory', transactionHistorySchema, 'TransactionHistories');
module.exports = TransactionHistory;
module.exports.Model = transactionHistorySchema;

module.exports.addTransaction = async function (user, admin, amount, note, info, type, before, after) {
    const params = {
        userId: new ObjectId(user),
        adminId: new ObjectId(admin),
        amount: amount,
        note: note,
        info: info,
        type: type,
        before: before,
        after: after
    };

    logger.info('TransactionHistoryModel::addTransaction is call with params', params);
    const transaction = new TransactionHistory(params);
    await transaction.save();
};
