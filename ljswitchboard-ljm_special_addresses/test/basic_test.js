
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
var output_test_files_dir = path.resolve(path.join(testPath, '..', 'output_test_files'));
var expected_output_test_files_dir = path.resolve(path.join(testPath, '..', 'expected_output_test_files'));

var tests = {
	'include ljm_special_addresses': function(test) {
		ljm_special_addresses = require('../lib/ljm_special_addresses');
		test.done();
	},
	'get_test_files': function(test) {
		// var filesToTest = fs.readdirSync(test_files_dir);
		// filesToTest.forEach(function(fileName) {
		// 	var testFileName = path.parse(fileName).name;
		// 	var testInfoFileName = testFileName + '.js';
		// 	var testInfoFilePath = path.join(test_files_info_dir, testInfoFileName);
		// 	var exists = fs.existsSync(testInfoFilePath);
		// 	if(exists) {
		// 		// console.log('Requiring...', testInfoFilePath);
		// 		testFiles.push(path.join(test_files_dir,fileName));
		// 		expectedDataTestFiles.push(require(testInfoFilePath).data);
		// 	}
		// });
		// console.log('Test files:', testFiles);
		// console.log('Test Data', expectedDataTestFiles);
		test.done();
	},
	// 'parse test files': function(test) {
	// 	var filePath = testFiles[2];
	// 	ljm_special_addresses.parse({'filePath': filePath})
	// 	.then(function(res) {
	// 		console.log('File Parsed', res.fileData);
	// 		test.done();
	// 	}, function(err) {
	// 		console.log('Error parsing', err);
	// 		test.done();
	// 	});
	// }
};

function generateFileParseTest(fileName, filePath, expFileData) {
	return function fileParseTest(test) {
		// console.log('Testing...', fileName);
		ljm_special_addresses.parse({'filePath': filePath})
		.then(function(res) {
			// console.log('File Parsed', res.fileData);
			test.deepEqual(res.fileData, expFileData);
			test.done();
		}, function(err) {
			console.log('Error parsing', err);
			test.ok(false, 'Should have parsed file...');
			test.done();
		});
	};
}

function generateFileSaveTest(fileName, outputFilePath, expectedFileContentsPath, fileDataToSave) {
	return function fileSaveTest(test) {
		ljm_special_addresses.save(fileDataToSave, {'filePath': outputFilePath})
		.then(function(res) {
			var createdFileData = fs.readFileSync(outputFilePath).toString();
			var expectedFileData = fs.readFileSync(expectedFileContentsPath).toString();
			test.strictEqual(createdFileData, expectedFileData);
			test.done();
		}, function(err) {
			console.log('Saved File Err', err);
			test.ok(false, 'Failed to create the output test file.');
			test.done();
		});
	};
}

var filesToTest = fs.readdirSync(test_files_dir);
filesToTest.forEach(function(fileName, i) {
	var testFileName = path.parse(fileName).name;
	var testInfoFileName = testFileName + '.js';
	var testInfoFilePath = path.join(test_files_info_dir, testInfoFileName);

	var exists = fs.existsSync(testInfoFilePath);
	if(exists) {
		// console.log('Requiring...', testInfoFilePath);
		var testFilePath = path.join(test_files_dir,fileName);
		var outputTestFilePath = path.join(output_test_files_dir, fileName);
		var expectedOutputTestFilePath = path.join(expected_output_test_files_dir, fileName);

		testFiles.push(testFilePath);
		
		var testFileExpData = require(testInfoFilePath).data;
		expectedDataTestFiles.push(testFileExpData);
		tests['File Parsing Test - ' + fileName] = generateFileParseTest(
			fileName,
			testFilePath,
			testFileExpData
		);
		tests['File Save Test - ' + fileName] = generateFileSaveTest(
			fileName,
			outputTestFilePath,
			expectedOutputTestFilePath,
			testFileExpData
		);
		
	}
});

exports.tests = tests;