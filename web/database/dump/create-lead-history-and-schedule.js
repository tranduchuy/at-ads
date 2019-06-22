const names = ["adamant", "adroit", "amatory", "animistic", "antic", "arcadian", "baleful", "bellicose", "bilious", "boorish", "calamitous", "caustic", "cerulean", "comely", "concomitant", "contumacious", "corpulent", "crapulous", "defamatory", "didactic", "dilatory", "dowdy", "efficacious", "effulgent", "egregious", "endemic", "equanimous", "execrable", "fastidious", "feckless", "fecund", "friable", "fulsome", "garrulous", "guileless", "gustatory", "heuristic", "histrionic", "hubristic", "incendiary", "insidious", "insolent", "intransigent", "inveterate", "invidious", "irksome", "jejune", "jocular", "judicious", "lachrymose", "limpid", "loquacious", "luminous", "mannered", "mendacious", "meretricious", "minatory", "mordant", "munificent", "nefarious", "noxious", "obtuse", "parsimonious", "pendulous", "pernicious", "pervasive", "petulant", "platitudinous", "precipitate", "propitious", "puckish", "querulous", "quiescent", "rebarbative", "recalcitant", "redolent", "rhadamanthine", "risible", "ruminative", "sagacious", "salubrious", "sartorial", "sclerotic", "serpentine", "spasmodic", "strident", "taciturn", "tenacious", "tremulous", "trenchant", "turbulent", "turgid", "ubiquitous", "uxorious", "verdant", "voluble", "voracious", "wheedling", "withering", "zealous"];

function randomEl(list) {
  const i = Math.floor(Math.random() * list.length);
  return list[i];
}

const LeadModel = require('../../models/LeadModel');
const LeadHistoryModel = require('../../models/LeadHistoryModel');
const LeadPriceScheduleModel = require('../../models/LeadPriceScheduleModel');
const CampaignModel = require('../../models/CampaignModel');
const moment = require('moment');
const mongoose = require('mongoose');

const createScheduleDownLeadPrice = async (leadId, campaign) => {
  const newSchedule = new LeadPriceScheduleModel();
  newSchedule.lead = new mongoose.Types.ObjectId(leadId);
  newSchedule.price = campaign.leadMaxPrice;
  newSchedule.minPrice = campaign.leadMinPrice;
  newSchedule.downPriceStep = campaign.downPriceStep;

  const now = moment();
  newSchedule.createdAt = now._d;
  newSchedule.updatedAt = now._d;
  newSchedule.downPriceAt = moment().add(campaign.downTime, 'minutes')._d;
  await newSchedule.save();
};

const getAllLeads = async () => {
  return await LeadModel.find()
    .populate('campaign')
    .lean();
};

const filterLeadNoExistSchedule = async (leads) => {
  const results = [];

  await Promise.all(leads.map(async (lead) => {
    if (!await LeadPriceScheduleModel.findOne({lead: lead._id}).lean()) {
      results.push(lead);
    }
  }));

  return results;
};

const createScheduleForLeads = async (leads) => {
  await Promise.all(leads.map(async lead => {
    await createScheduleDownLeadPrice(lead._id, lead.campaign);
  }));
};

const filterLeadNoExistHistory = async (leads) => {
  const results = [];

  await Promise.all(leads.map(async (lead) => {
    const histories = await LeadHistoryModel.find({lead: lead._id}).lean();
    if (histories.length === 0) {
      results.push(lead);
    }
  }));

  return results;
};

const createHistory = async (leads) => {
  await Promise.all(leads.map(async lead => {
    const newHistory = new LeadHistoryModel();
    const name = randomEl(names);
    newHistory.name = name;
    newHistory.email = `${name}@gmail.com`;
    newHistory.lead = new mongoose.Types.ObjectId(lead._id);
    await newHistory.save();
  }))
};


module.exports = async () => {
  const leads = await getAllLeads();
  console.log('leads', leads.length);

  // create schedule
  const noScheduleLeads = await filterLeadNoExistSchedule(leads);
  console.log('noScheduleLeads', noScheduleLeads.length);
  await createHistory(leads);

  // create history
  const noHistoryLeads = await filterLeadNoExistHistory(leads);
  console.log('noHistoryLeads', noHistoryLeads.length);
  await createScheduleForLeads(leads);
};