var assert = require('chai').assert;

var version_manager;
var versionData;

function validateVersionData(test, data, debug) {
	if(debug) {
		console.log('Validating Data', JSON.stringify(Object.keys(data), null, 2));
	}
}

var executionTimes = [];
function addExecutionTime(name, startTime, endTime) {
	var duration = endTime - startTime;

	var unit = 'ms';
	var divisor = 1;
	if(duration >= 1000) {
		unit = 's';
		divisor = 1000;
	}
	var durationStr = (duration/divisor).toFixed(4) + ' ' + unit;
	executionTimes.push({
		'name': name,
		'startTime': startTime,
		'endTime': endTime,
		'duration': duration,
		'durationStr': durationStr,
	});
}

function printVersions(versionData) {
	var keys = Object.keys(versionData);
	keys.forEach(function(key) {
		var firmwares = versionData[key];
		if(firmwares.forEach) {
			firmwares.forEach(function(firmware) {
				var linkPartials = firmware.upgradeLink.split('/');
				var finalPartial = linkPartials[linkPartials.length-1];
				var str = '  - ';
				str += 'V:' + firmware.version.toString();
				str += 'T:'+ firmware.type;
				str += 'K:'+ firmware.key;
				str += 'F:'+ finalPartial;
				// console.log(str);
				console.log(
					'  - ',
					'V:', firmware.version,
					'T:', firmware.type,
					'K:', firmware.key,
					'F:', finalPartial
				);
			});
		}
	});
}

describe('basic_test', function() {
	// return;
	// this.skip();
	// this.timeout(2000);
	it('require version_manager', function (done) {
		version_manager = require('../lib/version_manager');
		done();
	});
	it('get initial T7 Versions', function (done) {
		var data = version_manager.lvm.getCachedT7Versions();
		assert.isOk(!data.isValid, 'T7 Firmware data should not be valid yet');
		done();
	});
	it('initialize version_manager', function (done) {
		var startTime = new Date();
		version_manager.getAllVersions()
		.then(function(data) {
			var endTime = new Date();
			addExecutionTime('Initialization', startTime, endTime);
			assert.isOk(true);
			versionData = data;
			// validateVersionData(test, data, false);
			done();
		}, function(err) {
			assert.isOk(false, 'Error initializing version_manager');
			done();
		});
	});
	it('perform cached query', function (done) {
		var startTime = new Date();
		version_manager.getAllVersions()
		.then(function(data) {
			var endTime = new Date();
			addExecutionTime('Get Cached Versions', startTime, endTime);
			assert.isOk(true);
			// validateVersionData(test, data, false);
			done();
		}, function(err) {
			assert.isOk(false, 'Error getting version numbers');
			done();
		});
	});
	it('get T7 Versions', function (done) {
		var data = version_manager.lvm.getCachedT7Versions();
		assert.isOk(data.isValid, 'T7 Firmware data should be valid');
		var requiredKeys = [
			'current',
			'old',
			'beta'
		];

		// Print out data
		// console.log(' - Test Output:', JSON.stringify(data, null, 2));
		// printVersions(data);
		var givenKeys = Object.keys(data);
		requiredKeys.forEach(function(reqKey) {
			var isOk = false;
			if(givenKeys.indexOf(reqKey) >= 0) {
				isOk = true;
			}
			assert.isOk(isOk, '(T7 Firmware) Missing a required key: ' + reqKey);
		});
		// console.log('T7 FW Versions', data);
		done();
	});
	it('get T4 Versions', function (done) {
		var data = version_manager.lvm.getCachedT4Versions();
		assert.isOk(data.isValid, 'T4 Firmware data should be valid');
		var requiredKeys = [
			'current',
			// 'old',
			// 'beta'
		];

		// Print out data
		// console.log(' - T4 Test Output:', JSON.stringify(data, null, 2));
		// printVersions(data);
		var givenKeys = Object.keys(data);
		requiredKeys.forEach(function(reqKey) {
			var isOk = false;
			if(givenKeys.indexOf(reqKey) >= 0) {
				isOk = true;
			}
			assert.isOk(isOk, '(T4 Firmware) Missing a required key: ' + reqKey);
		});
		// console.log('T4 FW Versions', data);
		done();
	});
	// it('get Digit Versions', function (done) {
	// 	var data = version_manager.lvm.getCachedDigitVersions();
	// 	assert.isOk(data.isValid, 'Digit Firmware data should be valid');
	// 	var requiredKeys = [
	// 		'current',
	// 		'old',
	// 	];

	// 	// Print out data
	// 	// console.log(' - Digit Test Output:', JSON.stringify(data, null, 2));
	// 	// printVersions(data);
	// 	var givenKeys = Object.keys(data);
	// 	requiredKeys.forEach(function(reqKey) {
	// 		var isOk = false;
	// 		if(givenKeys.indexOf(reqKey) >= 0) {
	// 			isOk = true;
	// 		}
	// 		assert.isOk(isOk, '(Digit Firmware) Missing a required key: ' + reqKey);
	// 	});
	// 	// console.log('Digit FW Versions', data);
	// 	done();
	// });
	// it('get LJM Versions', function (done) {
	// 	var data = version_manager.lvm.getCachedLJMVersions();

	// 	// Print out data
	// 	// console.log(' - Test Output:', JSON.stringify(data, null, 2));
	// 	// printVersions(data);
	// 	assert.isOk(data.isValid, 'LJM Versions data should be valid');
	// 	var requiredKeys = ['current_win', 'current_mac', 'current_linux32', 'current_linux64'];
	// 	var givenKeys = Object.keys(data);
	// 	requiredKeys.forEach(function(reqKey, i) {
	// 		var isOk = false;
	// 		if(givenKeys.indexOf(reqKey) >= 0) {
	// 			isOk = true;
	// 		}
	// 		assert.isOk(isOk, '(LJM Check) Missing a required key: ' + reqKey);
	// 	});
	// 	done();
	// });
	// it('get Kipling Versions', function (done) {
	// 	var data = version_manager.lvm.getCachedKiplingVersions();

	// 	// Print out data
	// 	// console.log(' - Test Output:', JSON.stringify(data, null, 2));
	// 	// printVersions(data);
	// 	assert.isOk(data.isValid, 'Kipling Versions data should be valid');
	// 	var requiredKeys = ['current_win', 'current_mac', 'current_linux32', 'current_linux64'];
	// 	var givenKeys = Object.keys(data);
	// 	requiredKeys.forEach(function(reqKey, i) {
	// 		var isOk = false;
	// 		if(givenKeys.indexOf(reqKey) >= 0) {
	// 			isOk = true;
	// 		}
	// 		assert.isOk(isOk, '(Kipling Check) Missing a required key: ' + reqKey);
	// 	});
	// 	done();
	// });
	it('clear versions cache', function (done) {
		// console.log('T7 FW Versions', version_manager.lvm.getCachedT7Versions());
		version_manager.lvm.clearPageCache();
		// console.log('T7 FW Versions', version_manager.lvm.getCachedT7Versions());
		done();
	});
	it('secondary query', function (done) {
		var startTime = new Date();
		version_manager.getAllVersions()
		.then(function(data) {
			var endTime = new Date();
			addExecutionTime('Secondary query', startTime, endTime);
			assert.isOk(true);
			// validateVersionData(test, data);
			done();
		}, function(err) {
			assert.isOk(false, 'Error getting version numbers');
			done();
		});
	});
	it('check T7 versions', function (done) {
		version_manager.lvm.getT7FirmwareVersions()
		.then(function(data) {
			// console.log('T7 FW Versions', data);
			done();
		}, function(err) {
			assert.isOk(false,'Failed to get T7 firmware versions');
			done();
		});
	});
	it('Check load times', function (done) {
		var output = [];
		console.log('Execution Times:');
		executionTimes.forEach(function(executionTime) {
			var str = executionTime.name + ': ' + executionTime.durationStr;
			output.push(str);
			console.log(str);
		});
		done();
	});
});
