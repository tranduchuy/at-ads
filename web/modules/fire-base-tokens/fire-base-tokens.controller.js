const FireBaseTokensModel = require('../fire-base-tokens/fire-base-tokens.model');
const {  addFireBaseTokensValidationSchema } = require('./validations/add-fire-base-tokens.schema');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const Joi = require('@hapi/joi');
const requestUtil = require('../../utils/RequestUtil');
const HttpStatus = require('http-status-codes');

const addFireBaseToken = async (req, res, next) => {
    logger.info('fireBaseTokensController::addFireBaseToken::is called', { fireBaseToken: req.body.fireBaseToken });
    try{
        const { error } = Joi.validate(req.body, addFireBaseTokensValidationSchema);

        if (error) {
            return requestUtil.joiValidationResponse(error, res);
        }

        const { fireBaseToken } = req.body;
        const token = await FireBaseTokensModel.findOne({token: fireBaseToken});
        if(!token)
        {
            const newFireBaseToken = new FireBaseTokensModel({
                token: fireBaseToken
            });

            await newFireBaseToken.save();
        }

        logger.info('fireBaseTokensController::addFireBaseToken::success');
        return res.status(HttpStatus.OK).json({
            messages: ['Thêm thành công.'],
        });
    }catch(e){
        logger.error('fireBaseTokensController::addFireBaseToken::error', e);
        return next(e);
    }
};

module.exports = {
    addFireBaseToken
}