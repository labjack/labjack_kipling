
var q = require('q');
var ljm_ffi = require('@labjack/ljm-ffi');
var ljm = ljm_ffi.load();
var fs = require('fs');
var path = require('path');
var ljm_special_addresses;

var DEBUG_TEST = false;

var testFiles = [];
var expectedDataTestFiles = [];

var testPath = path.parse(module.filename).dir;
var examples_dir = path.resolve(path.join(testPath,'..','examples'));

var has_special_addresses = false;
var minLJMVersion = 1.09;

var tests = {
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

function generateExampleFileTest(fileName, filePath) {
	return function exampleFileTest(test) {
		// console.log('Testing...', fileName);
		var exec = require('child_process').exec;
		function handleChildExecution (error, stdout, stderr) {
			// console.log('stdout:', stdout);
			// console.log('stderr:', stderr);
			if (error !== null) {
				// console.log('exec error:', error);
				console.log('Error Code:', error.code);
				test.ok(
					false,
					'Example should not have exited with an error: ' + fileName
				);
			}
			test.ok(true, 'Successfully ran example.');
			test.done();
		}
		var child = exec('node ' + filePath, handleChildExecution);
	};
}

var filesToTest = fs.readdirSync(examples_dir);
filesToTest.forEach(function(exampleFile, i) {
	var exampleFileName = path.parse(exampleFile).name;
	var exampleFilePath = path.join(examples_dir, exampleFile);

	// console.log('Path...', exampleFilePath);
	// console.log('bla', exampleFile);

	tests['Running Example: ' + exampleFileName] = generateExampleFileTest(
		exampleFileName,
		exampleFilePath
	);
});

exports.tests = tests;