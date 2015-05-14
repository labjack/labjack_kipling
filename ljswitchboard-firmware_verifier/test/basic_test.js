

var firmware_verifier;
var fileData;
var fs = require('fs');
var path = require('path');

var testFiles = [{
		'deviceType': 'T7',
		'fileName': 'T7firmware_010146_2015-01-19.bin',
		'test': true,
	}, {
		'deviceType': 'Digit',
		'fileName': 'DigitFW_012200_04222015.bin',
		'test': true,
	}];
testFiles.forEach(function(testFile) {
	testFile.path = path.join(process.cwd(), 'test', testFile.fileName);
});
exports.tests = {
	'load firmware_verifier': function(test) {
		firmware_verifier = require('../lib/firmware_verifier');
		test.ok(true);
		test.done();
	},
	'test valid file': function(test) {
		var fileData = fs.readFileSync(testFiles[0].path);

		firmware_verifier.validateFirmwareFile(fileData, {
			'version': '1.0146',
			'deviceType': 'T7', // This flag isn't currently enabled but should be...
		})
		.then(function(parsedData) {
			// console.log('Parsed Data', parsedData);
			test.ok(parsedData.isValid, parsedData.message);
			test.done();
		});
	},
	'test invalid file': function(test) {
		var fileData = fs.readFileSync(testFiles[1].path);

		firmware_verifier.validateFirmwareFile(fileData, {
			'version': '1.0146',
			'deviceType': 'T7', // This flag isn't currently enabled but should be...
		})
		.then(function(parsedData) {
			test.strictEqual(parsedData.isValid, false, 'Should have failed');
			var reqMessage = 'Incorrect device type.';
			// console.log('Data', parsedData);
			test.deepEqual(parsedData.message, reqMessage, 'Wrong error message');
			test.done();
		});
	},
};