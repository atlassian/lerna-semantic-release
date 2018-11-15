var commitAnalyzer = require('@semantic-release/commit-analyzer');
var log = require('lerna-semantic-release-utils').log;
var affectsDelimiter = 'affects:';

module.exports = {
  analyze: function (_ref, cb) {
    var pkg = _ref.pkg;
    var commits = _ref.commits;

    var relevantCommits = commits.filter(function (commit) {
      return module.exports.isRelevant(module.exports.findAffectsLine(commit), pkg.name);
    });

    commitAnalyzer({}, Object.assign(_ref, {commits: relevantCommits}), function (err, type) {
      log.info('Anaylzed', relevantCommits.length, '/', commits.length, 'commits to determine type', type, 'for', pkg.name);
      relevantCommits.length && log.info('Relevant commits:\n* ', relevantCommits.map(function (commit) {
        return commit.hash;
      }).join('\n* '));
      cb(err, type);
    });
  },
  isRelevant: function (affectsLine, packageName) {
    var affectedPackages = module.exports.getAffectedPackages(affectsLine);
    return (affectedPackages.some(function (thisPackage) {
      if (thisPackage.indexOf('@') === -1 || thisPackage.lastIndexOf('@') === 0) {
        return thisPackage === packageName;
      }
      return false;
    }));
  },
  getAffectedPackages: function (affectsLine) {
    if (!affectsLine || affectsLine.indexOf(affectsDelimiter) !== 0) {
      return [];
    }
    var trimmedPackages = affectsLine.split(affectsDelimiter)[1].trim();
    if (trimmedPackages.length === 0) {
      return [];
    }
    return trimmedPackages.split(', ');
  },
  findAffectsLine: function (commit) {
    if (
      !commit ||
      !commit.message ||
      !commit.message.length ||
      !commit.message.match(affectsDelimiter)
    ) {
      return;
    }

    function reducer(affects, currentMessageLine) {
      if (affects.done || currentMessageLine.length === 0) {
        return affects;
      }

      if (
        affects.message.length > 0 || currentMessageLine.indexOf(affectsDelimiter) === 0
      ) {
        if (currentMessageLine[currentMessageLine.length - 1] !== ',') {
          affects.done = true;
        }

        affects.message += currentMessageLine + ' ';
        return affects;
      }

      return affects;
    }

    var affectsLine = commit
      .message
      .split('\n')
      .reduce(reducer, { message: '', done: false })
      .message
      .trim();

    return affectsLine;
  },
};
