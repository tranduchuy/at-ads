const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const CustomerInfomationsModel = require('./customer-infomation.model');

const createdCustomerInfo = async({uuid, name, splitNumber, email, domain, key}) => {
  logger.info("CustomerInfomationServices::createdCustomerInfo::is called", {uuid, name, splitNumber, email, domain, key});
  try{
    const newCustomer = new CustomerInfomationsModel({
      uuid,
      key,
      customerInfo: [{
        name,
        phoneNumber: splitNumber,
        email,
        domain,
        createdAt: new Date()
      }]
    });

    logger.info("CustomerInfomationServices::createdCustomerInfo::success");
    await newCustomer.save();
  }catch(e)
  {
    logger.error("CustomerInfomationServices::createdCustomerInfo::error", JSON.stringify(e));
    throw new Error(e);
  }
};

module.exports = {
  createdCustomerInfo
};