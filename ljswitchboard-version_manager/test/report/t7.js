
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
			})
		}
	});
}
exports.tests = {
	'require version_manager': function(test) {
		version_manager = require('../../lib/version_manager');
		done();
	},
	// 'get initial T7 Versions': function(test) {
	// 	var data = version_manager.lvm.getCachedT7Versions();
	// 	assert.isOk(!data.isValid, 'T7 Firmware data should not be valid yet');
	// 	done();
	// },
	'initialize version_manager': function(test) {
		var startTime = new Date();
		version_manager.getAllVersions()
		.then(function(data) {
			var endTime = new Date();
			addExecutionTime('Initialization', startTime, endTime);
			assert.isOk(true);
			versionData = data;
			validateVersionData(test, data, false);
			done();
		}, function(err) {
			assert.isOk(false, 'Error initializing version_manager');
			done();
		});
	},
	'get T7 Versions': function(test) {
		var data = version_manager.lvm.getCachedT7Versions();
		assert.isOk(data.isValid, 'T7 Firmware data should be valid');
		var requiredKeys = [
			'current',
			'old',
			// 'beta'
		];

		// Print out data
		// console.log(' - Test Output:', JSON.stringify(data, null, 2));
		printVersions(data);
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
	},
};
