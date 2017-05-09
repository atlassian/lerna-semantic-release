var async = require('async');
var path = require('path');
var npmconf = require('npmconf');

var srRegistry = require('semantic-release/src/lib/get-registry');

var tagging = require('lerna-semantic-release-utils').tagging;
var log = require('lerna-semantic-release-utils').log;
var forEachPackage = require('lerna-semantic-release-utils').forEachPackage;

function getPkgLocation (packagePath) {
  return path.join(packagePath, 'package.json')
}

function getPkg (packagePath, fs) {
  return JSON.parse(fs.readFileSync(getPkgLocation(packagePath)))
}

function getNpmConfig (done) {
  npmconf.load({}, done);
}

function makeSrConfig (npmConfig, done) {
  var pkg = getPkg(this.packagePath, this.io.fs);

  var defaults = {
    options: {
      branch: (pkg.release && pkg.release.branch) || 'master'
    }
  };

  var srConfig = Object.assign({}, defaults, {
    env: process.env,
    plugins: this.io.semanticRelease.plugins,
    npm: {
      auth: {
        token: process.env.NPM_TOKEN
      },
      loglevel: npmConfig.get('loglevel'),
      registry: srRegistry(pkg, npmConfig),
      tag: (pkg.publishConfig || {}).tag || npmConfig.get('tag') || 'latest'
    },
    pkg: pkg

  });
  done(null, srConfig);
}

function pre (srConfig, done) {
  var packagePath = this.packagePath;
  var packageName = getPkg(packagePath, this.io.fs).name;
  this.io.semanticRelease.pre(srConfig, function (err, nextRelease) {
    done(err, [packageName, { nextRelease, packagePath }]);
  });
}

function releaseTypeToNpmVersionType (releaseType) {
  return releaseType === 'initial' ? 'major' : releaseType;
}

function bumpVersionCommitAndTag (packageName, updates, releaseHash, io, done) {
  var update = updates[packageName];
  var packagePath = update.packagePath;
  var nextRelease = update.nextRelease;
  var pkg = getPkg(packagePath, io.fs);

  if (!nextRelease) {
    done(null);
    return;
  }

  log.info(nextRelease);

  pkg = updateDependencies(pkg, updates, 'dependencies');
  pkg = updateDependencies(pkg, updates, 'devDependencies');
  pkg = updateDependencies(pkg, updates, 'peerDependencies');

  var lernaTag = tagging.lerna(pkg.name, nextRelease.version);

  log.info('Creating tag', lernaTag);

  io.shell.pushdSync(packagePath);

  var releaseCommitMessage =  'chore(release): releasing component\n\n' +
                              'affects: ' + lernaTag + '\n\n' +
                              'Released from sha ' + releaseHash + '\n\n' +
                              '[skip ci]'; // skip CI run for these commits in Bitbucket Pipelines

  async.series([
    // persist the updated package.json
    savePkg(pkg, packagePath, io.fs),
    io.npm.version(releaseTypeToNpmVersionType(nextRelease.type)),
    io.git.commit(releaseCommitMessage + '\nTag for lerna release'),
    io.git.tag(lernaTag, 'tag for lerna releases')
  ], function (err) {
    io.shell.popdSync();
    done(err);
  });
}

function updateDependencies (pkg, updates, dependenciesKey) {
  var deps = pkg[dependenciesKey];

  if (!deps) {
    return pkg;
  }

  log.info('Updating ' + dependenciesKey + ' of ' + pkg.name);

  pkg[dependenciesKey] = Object.keys(deps).reduce(function (dependenciesObj, depName) {
    var update = updates[depName];

    if (!update) {
      // keep dependency version the same
      dependenciesObj[depName] = deps[depName];
      return dependenciesObj;
    }

    var oldVersion = deps[depName];
    var newVersion = '^' + update.nextRelease.version;

    log.info(depName + ' is updated: ' + oldVersion + ' -> ' + newVersion);

    dependenciesObj[depName] = newVersion;
    return dependenciesObj;
  }, {});

  return pkg;
}

function savePkg (pkg, packagePath, fs) {
  return function (done) {
    fs.writeFile(getPkgLocation(packagePath), JSON.stringify(pkg, null, 2), done);
  }
}

module.exports = function (config) {
  config.io.git.head(function (err, releaseHash) {
    err && log.error(err);

    forEachPackage([
      getNpmConfig,
      makeSrConfig,
      pre
    ], {
      allPackages: config.io.lerna.getAllPackages(),
      asyncType: async.waterfall,
      extraContext:  {
        releaseHash: releaseHash,
        io: config.io
      }
    }, (err, results) => {
      if (err && typeof config.callback === 'function') {
        config.callback(err);
        return;
      }

      var updates = results.reduce(function (acc, nameAndUpdatePair) {
        var name = nameAndUpdatePair[0];
        var update = nameAndUpdatePair[1];

        if (!update.nextRelease) {
          // skip packages that are not going to be released
          return acc;
        }

        acc[name] = update;
        return acc;
      }, {});

      var tasks = Object.keys(updates).map(function (updatedPackageName) {
        return function(done) {
          bumpVersionCommitAndTag(updatedPackageName, updates, releaseHash, config.io, done);
        }
      });

      async.series(tasks, function (error) {
        if (typeof config.callback === 'function') {
          config.callback(error);
        }
      });
    });

  });

};
