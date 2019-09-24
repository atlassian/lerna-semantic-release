var semverSeparator = '-semver-tag-for-';
var packageNamespacePrefix = '--namespace-prefix--';
var packageNamespaceSeparator = '--namespace-separator--';

module.exports = {
  lerna: function lerna (name, version) {
    return [name, '@', version].join('');
  },

  semver: function semver (name, version) {
    // make sure the special chars are escaped
    // in case a package name contains namespace
    // because otherwise the generated tag won't pass
    // validation for being a valid semver tag
    var nameWithNamespaceEscaped = name
      .replace('@', packageNamespacePrefix)
      .replace('/', packageNamespaceSeparator);

    return [version, semverSeparator, nameWithNamespaceEscaped].join('');
  },

  getTagParts: function getTagParts (tag) {
    if (!tag) {
      return null;
    }

    // handle semver tags
    if (tag.indexOf(semverSeparator) > -1) {
      var version = tag.split(semverSeparator)[0];
      var name = tag.split(semverSeparator)[1];
      name = name
        .replace(packageNamespacePrefix, '@')
        .replace(packageNamespaceSeparator, '/');

      return {
        name: name,
        version: version
      }
    }

    // handle lerna tags

    // we use lastIndex to skip leading "@" for namespaced packages
    const indexOfNameVersionSeparator = tag.lastIndexOf('@');

    if (indexOfNameVersionSeparator > -1) {
      return {
        name: tag.substring(0, indexOfNameVersionSeparator),
        version: tag.substring(indexOfNameVersionSeparator + 1)
      }
    }
  }
};
