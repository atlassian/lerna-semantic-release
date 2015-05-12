'use strict'

var fs = require('fs')

var semver = require('semver')

var getCommits = require('../lib/commits')
var npmInfo = require('../lib/npm-info')
var efh = require('../lib/error').efh

module.exports = function (options, plugins, cb) {
  var path = './package.json'
  var pkg = JSON.parse(fs.readFileSync(path))

  if (!pkg.name) return cb(new Error('Package must have a name'))

  npmInfo(pkg.name, efh(cb)(function (res) {
    getCommits(res.gitHead, efh(cb)(function (commits) {
      var analyzer = require(plugins.analyzer || '../lib/analyzer')
      var type = analyzer(commits)

      if (!type) return cb(null, null)

      pkg.version = res.version ? semver.inc(res.version, type) : '1.0.0'

      var writePkg = function () {
        if (!options.debug) fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n')
        cb(null, pkg.version)
      }

      if (!plugins.verification) return writePkg()

      var opts = {}

      if (typeof plugins.verification === 'string') {
        opts.name = plugins.verification
      }
      if (typeof plugins.verification === 'object') {
        opts = plugins.verification
      }

      opts.type = type
      opts.commits = commits
      opts.version = res.version
      opts.nextVersion = pkg.version

      var verification = require(opts.name)

      verification(opts, efh(cb)(function (ok) {
        if (ok) return writePkg()
        cb('verification failed')
      }))
    }))
  }))
}
