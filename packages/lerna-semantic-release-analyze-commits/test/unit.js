var expect = require('expect.js');
var analyzeCommits = require('../index');

describe('analyzing commits', function() {
  it('detects the correct fix version when the commit has two lines', function (done) {
    var commit = {"hash":"6fcf2d","message":"fix(package): first line\n\nsecond line.\n\naffects: pkg-a, pkg-b, pkg-c\n"};

    analyzeCommits.analyze({
      pkg: {name: 'pkg-b'},
      commits: [commit],
    }, function(err, type) {
      expect(err).to.equal(null);
      expect(type).to.equal('patch');
      done();
    });
  });
  it('detects the correct fix version when the commit has one line', function (done) {
    var commit = {"hash":"6fcf2d","message":"fix(package): first line\n\naffects: pkg-a, pkg-b, pkg-c\n"};

    analyzeCommits.analyze({
      pkg: {name: 'pkg-b'},
      commits: [commit],
    }, function(err, type) {
      expect(err).to.equal(null);
      expect(type).to.equal('patch');
      done();
    });
  });
  it('still detects changes after revert', function (done) {
    var commits = [
      {"hash":"abcdef","message":"Revert \"fix(package): first line\"\n\nThis reverts commit 6fcf2d.\n"},
      {"hash":"6fcf2d","message":"fix(package): first line\n\naffects: pkg-a, pkg-b, pkg-c\n"},
    ];

    analyzeCommits.analyze({
      pkg: {name: 'pkg-b'},
      commits: commits,
    }, function(err, type) {
      expect(err).to.equal(null);
      expect(type).to.equal('patch');
      done();
    });
  });
  describe('acts like semantic release', function () {
    var commits = [
      {"hash":"abcde4","message":"fix(package): first line\n\naffects: pkg-a\n"},
      {"hash":"abcde3","message":"feat(package): first line\n\naffects: pkg-a, pkg-b\n"},
      {"hash":"abcde2","message":"fix(package): first line\n\nBREAKING CHANGE: something\n\naffects: pkg-d\n"},
      {"hash":"abcde1","message":"chore(package): first line\n\naffects: pkg-a, pkg-b, pkg-c\n"},
    ];
    function expectType(packageName, expectedType, cb) {
      analyzeCommits.analyze({
        pkg: {name: packageName},
        commits: commits,
      }, function(err, type) {
        expect(err).to.equal(null);
        expect(type).to.equal(expectedType);
        cb();
      });
    }
    it('chore + feat = minor', function(done) {
      expectType('pkg-b', 'minor', done);
    });
    it('chore + feat + fix = minor', function(done) {
      expectType('pkg-a', 'minor', done);
    });
    it('chore = null', function(done) {
      expectType('pkg-b', 'minor', done);
    });
    it('break = major', function(done) {
      expectType('pkg-d', 'major', done);
    });
  });
});

describe('findAffectsLine: ', function () {
  it('finds the right line with one package', function () {
    var commit = {message: "feat(component): add package\n\naffects: abc\n"};
    expect(analyzeCommits.findAffectsLine(commit)).to.equal('affects: abc');
  });

  it('finds the right line with two packages', function () {
    var commit = {message: "feat(component): add packages\n\naffects: a, b\n"};
    expect(analyzeCommits.findAffectsLine(commit)).to.equal('affects: a, b');
  });
  it('finds the right line with a breaking change', function () {
    var commit = {message: "feat(component): add packages\n\nBREAKING CHANGE: something\n\naffects: a\n"};
    expect(analyzeCommits.findAffectsLine(commit)).to.equal('affects: a');
  });
  it('finds the right line with a breaking change and an extra message', function () {
    var commit = {message: "feat(component): add packages\n\nalso extra message\n\nBREAKING CHANGE: something\n\naffects: a\n"};
    expect(analyzeCommits.findAffectsLine(commit)).to.equal('affects: a');
  });
  it('finds no line when there is none', function () {
    var commit = {message: "chore(component): add packages\n"};
    expect(analyzeCommits.findAffectsLine(commit)).to.equal(undefined);
  });

  it('concatenates when the line is separated by a single newline char', function () {
    var commit = {message: "feat(component): add packages\n\naffects: a, b,\nc, d"}
    expect(analyzeCommits.findAffectsLine(commit)).to.equal('affects: a, b, c, d');
  });

  it('concatenates when the line is separated by a multiple newline chars', function () {
    var commit = {message: "feat(component): add packages\n\naffects: a, b,\n\n\nc, d,\ne"}
    expect(analyzeCommits.findAffectsLine(commit)).to.equal('affects: a, b, c, d, e');
  });

  it('concatenates until the last affected pacakge', function () {
    var commit = {message: "feat(component): add packages\n\naffects: a, b,\n\n\nc, d,\ne\nfoobarbaz"}
    expect(analyzeCommits.findAffectsLine(commit)).to.equal('affects: a, b, c, d, e');
  });

  it('doesnt concatenate if the affects line doesnt end in a comma', function () {
    var commit = {message: `feat(component): DO NOT MERGE THIS

affects: aaaaaaaaaaa, bbbbbbbbbbb, ccccccccccc, ddddddddddd, eeeeeeeeeee,
fffffffffff, ggggggggggg, hhhhhhhhhhh, iiiiiiiiiii, jjjjjjjjjjj,

kkkkkkkkkkk, lllllllllll, mmmmmmmmmmm, nnnnnnnnnnn, ooooooooooo

SERIOUSLY, DO NOT MERGE THIS`}

    expect(analyzeCommits.findAffectsLine(commit)).to.equal('affects: aaaaaaaaaaa, bbbbbbbbbbb, ccccccccccc, '
      + 'ddddddddddd, eeeeeeeeeee, fffffffffff, ggggggggggg, hhhhhhhhhhh, iiiiiiiiiii, '
      + 'jjjjjjjjjjj, kkkkkkkkkkk, lllllllllll, mmmmmmmmmmm, nnnnnnnnnnn, ooooooooooo');
  });
});

describe('getting affected packages:', function () {
  it('returns nothing when no pacakges were affected', function () {
    expect(analyzeCommits.getAffectedPackages(null)).to.be.empty();
    expect(analyzeCommits.getAffectedPackages(undefined)).to.be.empty();
    expect(analyzeCommits.getAffectedPackages('')).to.be.empty();
  });
  it('gets one package', function () {
    expect(analyzeCommits.getAffectedPackages('affects: 1')).to.eql(['1']);
  });
  it('gets two packages', function () {
    expect(analyzeCommits.getAffectedPackages('affects: 1, 2')).to.eql(['1', '2']);
  });
  it('gets two packages with scopes', function () {
    expect(analyzeCommits.getAffectedPackages('affects: @foo/1, @foo/2')).to.eql(['@foo/1', '@foo/2']);
  });
  it('gets no packages when no packages present', function () {
    expect(analyzeCommits.getAffectedPackages('affects: ')).to.eql([]);
  });
  it('gets one package when only a comma is present', function () {
    expect(analyzeCommits.getAffectedPackages('affects: , ')).to.eql([',']);
  });
})

describe('detecting relevance: ', function () {
  it('detects relevance with two packages', function () {
    expect(analyzeCommits.isRelevant('affects: package1, package2', 'package1')).to.equal(true);
  });
  it('detects relevance with one package', function () {
    expect(analyzeCommits.isRelevant('affects: package1', 'package1')).to.equal(true);
  });
  it('detects irrelevance with one package', function () {
    expect(analyzeCommits.isRelevant('affects: package1', 'foo')).to.equal(false);
  });
  it('detects irrelevance with two packages', function () {
    expect(analyzeCommits.isRelevant('affects: package1, package2', 'foo')).to.equal(false);
  });
  it('detects relevance with one versioned package', function () {
    expect(analyzeCommits.isRelevant('affects: package1@foo', 'package1')).to.equal(true);
  });
  it('detects relevance with two versioned packages', function () {
    expect(analyzeCommits.isRelevant('affects: package1@1.2.3, package2@3.4.5', 'package1')).to.equal(true);
  });
  it('detects irrelevance with two versioned packages', function () {
    expect(analyzeCommits.isRelevant('affects: package1@1.2.3, package2@3.4.5', 'package1')).to.equal(true);
  });
  it('detects relevance with scoped packages', function () {
    expect(analyzeCommits.isRelevant('affects: @package1, @package2, @package3', '@package3')).to.equal(true);
  });
  it('detects irrelevance with scoped packages', function () {
    expect(analyzeCommits.isRelevant('affects: @package1, @package2, @package3', '@@@@')).to.equal(false);
  });
  it('detects relevance with scoped, versioned packages', function () {
    expect(analyzeCommits.isRelevant('affects: @package1@1.1.1', '@package1')).to.equal(true);
  });
  it('detects irrelevance with scoped, versioned packages', function () {
    expect(analyzeCommits.isRelevant('affects: @package1@1.1.1', '@package2')).to.equal(false);
  });
});
