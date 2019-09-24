const expect = require('expect.js');
const utils = require('../index');

describe('tagging', function() {

  const tagging = utils.tagging;

  describe('lerna', function() {
    it('should generate correct lerna tag for regular packages', function() {
      expect(tagging.lerna('my-regular-package', '3.3.3')).to.be('my-regular-package@3.3.3');
    });

    it('should generate correct lerna tag for namespaced packages', function() {
      expect(tagging.lerna('@my-org/my-namespaced-package', '1.0.0')).to.be('@my-org/my-namespaced-package@1.0.0');
    });
  });

  describe('semver', function() {
    it('should generate correct temporary semver tag for regular packages', function() {
      expect(tagging.semver('my-regular-package', '3.3.3')).to.be('3.3.3-semver-tag-for-my-regular-package');
    });

    it('should generate correct temporary semver tag for namespaced packages', function() {
      expect(tagging.semver('@my-org/my-namespaced-package', '1.0.0')).to.be(
        '1.0.0-semver-tag-for---namespace-prefix--my-org--namespace-separator--my-namespaced-package'
      );
    });
  });

  describe('getTagParts', function() {

    describe('when lerna tag is passed', function() {
      it('should work with regular package names', function () {
        expect(tagging.getTagParts('my-regular-package@1.0.0')).to.eql({
          name: 'my-regular-package',
          version: '1.0.0'
        });
      });

      it('should work with namespaced package names', function () {
        expect(tagging.getTagParts('@my-org/my-namespaced-package@9.9.9')).to.eql({
          name: '@my-org/my-namespaced-package',
          version: '9.9.9'
        });
      });
    });

    describe('when temporary semver tag is passed', function() {
      it('should work with regular package names', function () {
        expect(tagging.getTagParts('1.0.0-semver-tag-for-my-regular-package')).to.eql({
          name: 'my-regular-package',
          version: '1.0.0'
        });
      });

      it('should work with namespaced package names', function () {
        expect(tagging.getTagParts(
          '9.9.9-semver-tag-for---namespace-prefix--my-org--namespace-separator--my-namespaced-package'
        )).to.eql({
          name: '@my-org/my-namespaced-package',
          version: '9.9.9'
        });
      });
    })

  });

});
