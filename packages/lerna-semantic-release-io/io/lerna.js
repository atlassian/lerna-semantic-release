const { getPackages } = require("@lerna/project");

module.exports = {
  getAllPackages: function () {
    return getPackages()
  }
};
