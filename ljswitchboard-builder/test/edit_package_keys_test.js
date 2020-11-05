// edit_package_keys_test.js
// Expects to be called with cwd: labjack_kipling/ljswitchboard-builder
var assert = require('chai').assert;

var fse = require('fs-extra');

var editPackageKeys = require('../build_scripts/utils/edit_package_keys.js').editPackageKeys;

const TEST_REQUIRED_KEYS = {
	"dependencies": {
		"thing": "../thing.tgz",
	}
};
const TEST_BUNDLE = {
	project_path: './test/edit_package_keys_test',
	required_keys: TEST_REQUIRED_KEYS,
};

const EXPECTED_NOT_RECURSIVE = {
	"name": "edit_package_keys_test",
	"version": "1.0.0",
	"dependencies": {
		"thing": "../thing.tgz",
	}
};
const EXPECTED_RECURSIVE = {
	"name": "edit_package_keys_test",
	"version": "1.0.0",
	"dependencies": {
		"thing": "../thing.tgz",
		"other": "4.5.6"
	}
};

describe('edit package keys', function() {
	beforeEach(function (done) {
		fse.copySync(
			'./test/edit_package_keys_test/initial.json',
			'./test/edit_package_keys_test/package.json'
		);
		done();
	});
	it('not_recursive', function (done) {
		editPackageKeys(TEST_BUNDLE, false);
		var result = fse.readJsonSync('./test/edit_package_keys_test/package.json');
		assert.deepEqual(result, EXPECTED_NOT_RECURSIVE);
		done();
	});
	it('recursive', function (done) {
		editPackageKeys(TEST_BUNDLE, true);
		var result = fse.readJsonSync('./test/edit_package_keys_test/package.json');
		assert.deepEqual(result, EXPECTED_RECURSIVE);
		done();
	});
});
