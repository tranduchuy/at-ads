const isValidPhoneNumber = (phone) => {
  if (phone.length < 10 || phone.length > 12) {
    return false;
  }

  return true;
};

module.exports = {
  isValidPhoneNumber
};
