const SessionsModel = require('./sessions.model');

const createSession = async ({
                               ip
                             }) => {
  try {
    const newSession = new SessionsModel({
      ip
    });

    return await newSession.save();
  } catch (e) {
    console.log(e);
    return e;
  }
};

module.exports = {
  createSession
};
