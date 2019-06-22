const LeadModel = require('../../models/LeadModel');
const moment = require('moment');

module.exports = async () => {
  const leads = await LeadModel.find();
  Promise.all(leads.map(async lead => {
    if (lead.status === global.STATUS.LEAD_NEW) {
      lead.boughtAt = null;
    } else {
      lead.boughtAt = moment().subtract(1, 'days');
    }

    await lead.save();
  }));

  console.log('Finish update bought at');
};