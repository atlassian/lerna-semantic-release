var async = require('async');

var log = require('./log');
var bindTasks = require('./bind-tasks');

module.exports = function forEachPackage (tasks, options, done) {
  var extraContext = (options && options.extraContext) || {};
  var asyncType = (options && options.asyncType) || async.series;
  var packages = options.allPackages;

  packages.then(pkgs => {
    var packageLocations = pkgs.map(function (pkg) {
      return pkg.location;
    });

    var tasksToRunInEachPackage = packageLocations.map(function (packagePath) {
      return function (next) {
        var contextBoundTasks = bindTasks(tasks, Object.assign({}, extraContext, {packagePath: packagePath}), packagePath);

        asyncType(contextBoundTasks, function (err) {
          err && log.error(err);
          next();
        });
      }
    });

    async.series(tasksToRunInEachPackage, function (err) {
      err && log.error(err);
      done && done();
    });
  });

};
