var conventionalChangelog = require('conventional-changelog');
var fs = require('fs');
var path = require('path');
var dateFormat = require('dateformat');


var forEachPackage = require('lerna-semantic-release-utils').forEachPackage;
var tagging = require('lerna-semantic-release-utils').tagging;
var analyzer = require('lerna-semantic-release-analyze-commits');

var CHANGELOG_FILE_NAME = 'CHANGELOG.md';

function getPkgPath (packagePath) {
  return path.join(packagePath, 'package.json')
}

function getPkg (packagePath) {
  return JSON.parse(fs.readFileSync(getPkgPath(packagePath)));
}

/**
 * Reformat a commit to contain a version (based on git tags) and the proper date.
 * Mostly from the default (conventional-changelog-core/lib/merge-config.js)
 * @param commit
 * @returns commit the modified commit
 */
function reformatCommit (commit) {
  if (commit.committerDate) {
    commit.committerDate = dateFormat(commit.committerDate, 'yyyy-mm-dd', true);
  }
  var isReleaseCommit = commit.type === 'chore' && commit.scope === 'release';
  if (!isReleaseCommit) {
    return commit;
  }
  var affectedPackages = analyzer.getAffectedPackages(getAffectsLine(commit));
  var hasVersion = affectedPackages[0] &&
    tagging.getTagParts(affectedPackages[0]) &&
    tagging.getTagParts(affectedPackages[0]).version;

  if (!hasVersion) {
    return commit;
  }
  var newVersion = tagging.getTagParts(affectedPackages[0]).version;
  commit.version = newVersion;
  return commit;
}

function getAffectsLine (commit) {
  return analyzer.findAffectsLine({message: commit.body});
}

function createChangelog (done) {
  var packagePath = this.packagePath;
  var rootPackageRepository = this.rootPackageRepository;
  var io = this.io;

  var pkgJsonPath = getPkgPath(packagePath);
  var writeStream = io.fs.createWriteStream(path.join(packagePath, CHANGELOG_FILE_NAME));
  var stream = conventionalChangelog({
    preset: 'angular',
    transform: function (commit, cb) {
      var pkgJsonFile = getPkg(packagePath);
      var isRelevant = analyzer.isRelevant(getAffectsLine(commit), pkgJsonFile.name);

      if (isRelevant) {
        commit = reformatCommit(commit);
        cb(null, commit);
        return;
      }

      cb(null, null);
    },
    pkg: {
      path: pkgJsonPath
    },
    releaseCount: 0
  }, {
    repoUrl: typeof rootPackageRepository !== 'object' ? rootPackageRepository : rootPackageRepository.url
  }).pipe(writeStream);

  stream.on('close', function () {
    done(null);
  });
}

module.exports = function (config) {
  var rootPackageRepository = JSON.parse(fs.readFileSync('./package.json')).repository;
  forEachPackage([
    createChangelog,
  ], {
    allPackages: config.io.lerna.getAllPackages(),
    extraContext: {
      rootPackageRepository: rootPackageRepository,
      io: config.io
    }
  }, (err) => {
    if (typeof config.callback === 'function') {
      config.callback(err);
    }
  });
};
