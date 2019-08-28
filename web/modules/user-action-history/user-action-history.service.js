const UserActionHistoryModel = require('./user-action-history.model');

const createUserActionHistory = async ({
                                       userId, content, param
                                     }) => {
  try {
    const newUserActionHistory = new UserActionHistoryModel({
      userId,
      content: content || null,
      param: param || null
    });
    await newUserActionHistory.save();
    return;

  } catch (e) {
    console.log(e);
    return;
  }
};

module.exports = {
  createUserActionHistory
};
