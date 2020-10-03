var assert = require('chai').assert;

var ljm_ffi = require('ljm-ffi');
var ljm = ljm_ffi.load();
var fs = require('fs');
var path = require('path');

var testPath = path.parse(module.filename).dir;
var examples_dir = path.resolve(path.join(testPath,'..','examples'));

var has_special_addresses = false;
var minLJMVersion = 1.09;

function generateExampleFileTest(fileName, filePath) {
	return function exampleFileTest(done) {
		// console.log('Testing...', fileName);
		var exec = require('child_process').exec;
		function handleChildExecution (error, stdout, stderr) {
			// console.log('stdout:', stdout);
			// console.log('stderr:', stderr);
			if (error !== null) {
				// console.log('exec error:', error);
				console.log('Error Code:', error.code);
				assert.isOk(
					false,
					'Example should not have exited with an error: ' + fileName
				);
			}
			assert.isOk(true, 'Successfully ran example.');
			done();
		}
		var child = exec('node ' + filePath, handleChildExecution);
	};
}


describe('run examples', function() {
	it('Check LJM Version for Special Address implementation', function (done) {
		var ljmLibraryVersion = ljm.LJM_ReadLibraryConfigS('LJM_LIBRARY_VERSION', 0);
		var expectedData = {
			'ljmError': 0,
			'Parameter': 'LJM_LIBRARY_VERSION',
			'Value': ljmLibraryVersion.Value,
		};
		if(ljmLibraryVersion.Value >= minLJMVersion) {
			has_special_addresses = true;
		}
		assert.deepEqual(ljmLibraryVersion, expectedData);
		done();
	});

	var filesToTest = fs.readdirSync(examples_dir);
	filesToTest.forEach(function(exampleFile, i) {
		var exampleFileName = path.parse(exampleFile).name;
		var exampleFilePath = path.join(examples_dir, exampleFile);

		// console.log('Path...', exampleFilePath);
		// console.log('bla', exampleFile);

		it('Running Example: ' + exampleFileName, function (done) {
			generateExampleFileTest(
				exampleFileName,
				exampleFilePath
			)(done);
		});
	});

});
