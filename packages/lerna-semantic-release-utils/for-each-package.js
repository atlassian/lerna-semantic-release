var async = require('async');

var log = require('./log');
var bindTasks = require('./bind-tasks');

module.exports = function forEachPackage (tasks, options, done) {
  var extraContext = (options && options.extraContext) || {};
  var asyncType = (options && options.asyncType) || async.series;
  var packages = options.allPackages;

  var packageLocations = packages.map(function (pkg) {
    return pkg.location;
  });

  var tasksToRunInEachPackage = packageLocations.map(function (packagePath) {
    return function (next) {
      var contextBoundTasks = bindTasks(tasks, Object.assign({}, extraContext, {packagePath: packagePath}), packagePath);

      asyncType(contextBoundTasks, function (err, result) {
        err && log.error(err);
        next(null, result);
      });
    }
  });

  async.series(tasksToRunInEachPackage, function (err, results) {
    err && log.error(err);
    done && done(null, results);
  });
};
