var execAsTask = require('lerna-semantic-release-utils').execAsTask;

module.exports = {
  publish: function version (path, pkg) {
    var isScopedPublicPackage = false ;
    if (pkg.name.charAt(0)=='@' && pkg.config ) {
      if (pkg.config.access) {
        isScopedPublicPackage = (pkg.config.access=='public');
      }
    }
    return execAsTask('npm publish ' + (isScopedPublicPackage ? '--access=public ' :'') + path);
  },
  version: function version (v) {
    return execAsTask('npm version ' + v + ' --git-tag-version false');
  },
  getVersion: function getVersion (packageName) {
    return function (done) {
      execAsTask(`npm view ${packageName} version`, {silent: true})(function (err, stdout) {
        done(err, stdout.trim());
      });
    }
  }
};
