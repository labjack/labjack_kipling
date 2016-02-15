
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

var has_special_addresses = false;
var minLJMVersion = 1.09;

var tests = {
	'include ljm_special_addresses': function(test) {
		ljm_special_addresses = require('../lib/ljm_special_addresses');
		test.done();
	},
	'Check LJM Version for Special Address implementation': function(test) {
		var ljmLibraryVersion = ljm.LJM_ReadLibraryConfigS('LJM_LIBRARY_VERSION', 0);
		var expectedData = {
			'ljmError': 0,
			'Parameter': 'LJM_LIBRARY_VERSION',
			'Value': ljmLibraryVersion.Value,
		};
		if(ljmLibraryVersion.Value >= minLJMVersion) {
			has_special_addresses = true;
		}
		test.deepEqual(ljmLibraryVersion, expectedData);
		test.done();
	},
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

function checkLJMSpecialAddressesStatus(data) {
	var defered = q.defer();
	function handleReadLibConfigStr(ljmSpecialAddressesStatus) {
		var isOk = true;
		if(ljmSpecialAddressesStatus.ljmError) {
			isOk = false;
		}
		data.specAddrStatus = ljmSpecialAddressesStatus.String;
		defered.resolve(data);
	}
	if(has_special_addresses) {
		ljm.LJM_ReadLibraryConfigStringS.async(
			'LJM_SPECIAL_ADDRESSES_STATUS',
			'',
			handleReadLibConfigStr
		);
	} else {
		console.log(' ! This version of LJM does not have the LJM Special Addresses feature.');
		defered.resolve(data);
	}
	return defered.promise;
}

function checkLJMSpecialAddressesFile(data) {
	var defered = q.defer();
	function handleReadLibConfigStr(ljmSpecialAddressesFileLocation) {
		var isOk = true;
		if(ljmSpecialAddressesFileLocation.ljmError) {
			isOk = false;
		}
		data.specAddrFile = ljmSpecialAddressesFileLocation.String;
		defered.resolve(data);
	}
	if(has_special_addresses) {
		ljm.LJM_ReadLibraryConfigStringS.async(
			'LJM_SPECIAL_ADDRESSES_FILE',
			'',
			handleReadLibConfigStr
		);
	} else {
		console.log(' ! This version of LJM does not have the LJM Special Addresses feature.');
		defered.resolve(data);
	}
	return defered.promise;
}

function generateVerifyLoadWithLJMTest(fileName, filePath) {
	return function verifyLoadWithLJMTest(test) {
		var data = {};

		function finalize(data) {
			// console.log('Verify Load W/ LJM Success', data);
			test.strictEqual(data.specAddrFile, filePath, 
				'LJM did not load the correct file');
			test.done();
		}
		function handleError(data) {
			console.log('Verify Load W/ LJM Error', data);
			test.ok(false, 'There was an error verifying S.A. loading w/ LJM');
			test.done();
		}

		checkLJMSpecialAddressesStatus(data)
		.then(checkLJMSpecialAddressesFile)
		.then(finalize)
		.catch(handleError);
	};
}

function generateLJMLoadSpecialAddressesFile(fileName, filePath) {
	return function ljmLoadSpecialAddressesFile(test) {
		// console.log('Testing...', fileName);
		ljm_special_addresses.load({'filePath': filePath})
		.then(function(res) {
			console.log('File Loaded', res);
			// test.deepEqual(res.fileData, expFileData);
			test.done();
		}, function(err) {
			console.log('Error parsing', err);
			// test.ok(false, 'Should have parsed file...');
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

		var outputData = testFileExpData.map(function(a) { return a; });
		outputData.push({
			'ip': '169.169.169.169',
			'comments': ['added ip in basic_test'],
		});
		outputData.push({
			'ip': '192.168.1.10',
			'comments': ['added ip in basic_test'],
		});

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
			outputData
		);
		
		tests['Verify Load With LJM Test - ' + fileName] = generateVerifyLoadWithLJMTest(
			fileName,
			outputTestFilePath
		);

		tests['Load With LJM Test - ' + fileName] = generateLJMLoadSpecialAddressesFile(
			fileName,
			outputTestFilePath
		);

		
	}
});

exports.tests = tests;