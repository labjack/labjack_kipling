
var q = require('q');
var ljm_ffi = require('ljm-ffi');
var ljm = ljm_ffi.load();
var fs = require('fs');
var path = require('path');
var ljm_special_addresses;

var DEBUG_TEST = false;

var testFiles = [];
var expectedDataTestFiles = [];

var testPath = path.parse(module.filename).dir;
var test_files_dir = path.resolve(path.join(testPath,'..','test_files'));
var test_files_info_dir = path.resolve(path.join(testPath,'..','test_files_info'));

var tests = {
	'include ljm_special_addresses': function(test) {
		ljm_special_addresses = require('../lib/ljm_special_addresses');
		test.done();
	},
	'get_test_files': function(test) {
		var filesToTest = fs.readdirSync(test_files_dir);
		filesToTest.forEach(function(fileName) {
			var testFileName = path.parse(fileName).name;
			var testInfoFileName = testFileName + '.js';
			var testInfoFilePath = path.join(test_files_info_dir, testInfoFileName);
			var exists = fs.existsSync(testInfoFilePath);
			if(exists) {
				// console.log('Requiring...', testInfoFilePath);
				testFiles.push(path.join(test_files_dir,fileName));
				expectedDataTestFiles.push(require(testInfoFilePath).data);
			}
		});
		// console.log('Test files:', testFiles);
		// console.log('Test Data', expectedDataTestFiles);
		test.done();
	},
	'parse test files': function(test) {
		var filePath = testFiles[2];
		ljm_special_addresses.parse({'filePath': filePath})
		.then(function(res) {
			console.log('File Parsed', res.fileData);
			test.done();
		}, function(err) {
			console.log('Error parsing', err);
			test.done();
		})
	}
};

exports.tests = tests;