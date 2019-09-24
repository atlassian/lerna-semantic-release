var io = require('lerna-semantic-release-io').mocks();
var expect = require('expect.js');
var path = require('path');
var post = require('../index');
var fs = require('fs');

function mockFilesInDirectory (directory, fileNames) {
  var mockFiles = {};
  var absoluteDirectory = path.resolve(directory);
  fileNames.forEach(function (fileName) {
    mockFiles[fileName] = fs.readFileSync(path.join(absoluteDirectory, fileName)).toString();
  });
  return mockFiles;
}

function mockNodeModules (fsState) {
  var pathToMock = 'node_modules/conventional-changelog-writer/templates';
  fsState[path.resolve(pathToMock)] = mockFilesInDirectory(pathToMock, [
    'commit.hbs',
    'footer.hbs',
    'header.hbs',
    'template.hbs'
  ]);

  return fsState;
}

function makeBasicState () {
  var fsState = {
    'packages': {
      'a': {
        'index.js': 'Published',
        'package.json': JSON.stringify({name: 'a', version: '0.0.2', repository: { type: 'git', url: 'http://follow.me' }})
      },
      'b': {
        'index.js': 'Published',
        'package.json':JSON.stringify({name: 'b', version: '0.0.1', repository: { type: 'git', url: 'http://follow.me' }})
      },
    },
    'package.json': JSON.stringify({name: 'main', version: '0.0.0'}),
    'lerna.json': JSON.stringify({lerna: '2.0.0-beta.34', version: 'independent'})
  };

  var packageVersions = {
    versions: {
      'a': '0.0.2',
      'b': '0.0.1',
    },
    latestVersions: {
      'a': {
        version: '0.0.2',
        gitHead: '3FIXA'
      },
      'b': {
        version: '0.0.1',
        gitHead: '2FIXAB'
      }
    }
  };

  return {
    fs: mockNodeModules(fsState),
    git: {
      head: 'RELEASE4',
      log: [
        {
          message: 'chore(release): release component\n\naffects: a@0.0.2',
          hash: 'RELEASE4',
          date: '2015-08-22 12:01:42 +0200',
        },
        {
          message: 'fix: a\n\naffects: a',
          hash: '3FIXA',
          date: '2015-08-22 12:01:42 +0200',
        },
        {
          message: 'chore(release): release component\n\naffects: a@0.0.1',
          hash: 'RELEASE3',
          date: '2015-08-22 12:01:42 +0200',
        },
        {
          message: 'chore(release): release component\n\naffects: b@0.0.1',
          hash: 'RELEASE2',
          date: '2015-08-22 12:01:42 +0200',
        },
        {
          message: 'fix: a b\n\naffects: a, b',
          hash: '2FIXAB',
          date: '2015-08-22 12:01:42 +0200',
        },
        {
          message: 'chore(release): release component\n\naffects: b@0.0.0',
          hash: 'RELEASE1',
          date: '2015-08-22 12:01:42 +0200',
        },
        {
          message: 'fix: b\n\naffects: b',
          hash: '1FIXB',
          date: '2015-08-22 12:01:42 +0200'
        },
        {
          message: 'chore: the first commit',
          hash: 'FIRST',
          date: '2015-08-22 12:01:42 +0200',
        }
      ]
    },
    npm: packageVersions,
    lerna: packageVersions
  };
}

describe('post', function() {
  describe('with two packages', function() {
    beforeEach(function () {
      io.mock(makeBasicState());
    });

    afterEach(function () {
      io.restore();
    });

    describe('executing', function () {
      beforeEach(function (done) {
        post({
          io: io,
          callback: done
        });
      });

      it('npm publish is not called', function () {
        expect(io.npm.publish.innerTask.callCount).to.equal(0);
      });

      it('git push is not called', function () {
        expect(io.git.push.innerTask.callCount).to.equal(0);
      });

      it('git push --tags is not called', function () {
        expect(io.git.pushTags.innerTask.callCount).to.equal(0);
      });

      function countOccurrences (s, regex) {
        return (s.match(regex) || []).length;
      }

      it('changelog contains correct content for package A', function () {
        var changeLog = fs.readFileSync('./packages/a/CHANGELOG.md').toString();
        expect(countOccurrences(changeLog, /<a name=/g)).to.equal(3);
        expect(countOccurrences(changeLog, /\* fix:/g)).to.equal(2);
        expect(countOccurrences(changeLog, /##\D+0.0.2/g)).to.equal(2);
        expect(countOccurrences(changeLog, /##\D+0.0.1/g)).to.equal(1);
        expect(countOccurrences(changeLog, /\* fix: b/g)).to.equal(0);
      });

      it('changelog contains correct URL for package A', function () {
        var changeLog = fs.readFileSync('./packages/a/CHANGELOG.md').toString();
        expect(countOccurrences(changeLog, /\[3FIXA\]\(http:\/\/follow.me\/commits\/3FIXA\)/g)).to.equal(1);
        expect(countOccurrences(changeLog, /\[2FIXAB\]\(http:\/\/follow.me\/commits\/2FIXAB\)/g)).to.equal(1);
      });
    });
  });
});
