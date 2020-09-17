// edit_package_keys_test.js
// Expects to be called with cwd: labjack_kipling/ljswitchboard-builder


var fse = require('fs-extra');
var path = require('path');

var editPackageKeys = require('../build_scripts/edit_package_keys.js').editPackageKeys;

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

exports.tests = {
	setUp: function(callback) {
		fse.copySync(
			'./test/edit_package_keys_test/initial.json',
			'./test/edit_package_keys_test/package.json'
		);
		callback();
	},

	'not_recursive': function(test) {
		editPackageKeys(TEST_BUNDLE, false);
		var result = fse.readJsonSync('./test/edit_package_keys_test/package.json');
		test.deepEqual(result, EXPECTED_NOT_RECURSIVE);
		test.done();
	},

	'recursive': function(test) {
		editPackageKeys(TEST_BUNDLE, true);
		var result = fse.readJsonSync('./test/edit_package_keys_test/package.json');
		test.deepEqual(result, EXPECTED_RECURSIVE);
		test.done();
	},
};

