
var data_parser = require('../lib/data_parser');
var modbus_map = require('ljswitchboard-modbus_map');
var constants = modbus_map.getConstants();


var testResults = function(test, results, reqResults) {
	var i, j;
	for(j = 0; j < results.length; j++) {
		var resultKeys = Object.keys(results[j]);
		var reqResultKeys = Object.keys(reqResults[j]);
		for(i = 0; i < resultKeys.length; i++) {
			if(resultKeys[i] !== reqResultKeys[i]) {
				console.log('Key doesnt match', resultKeys[i], reqResultKeys[i]);
			}
			if(results[j][resultKeys[i]] !== reqResults[j][resultKeys[i]]) {
				console.log('Attribute:',resultKeys[i]);
				console.log('  - res',results[j][resultKeys[i]]);
				console.log('  - req', reqResults[j][resultKeys[i]]);
			}
			test.deepEqual(results[j][resultKeys[i]], reqResults[j][resultKeys[i]], 'Attribute: ' + resultKeys[i]);
		}
	}
	for(i = 0; i < results.length; i++) {
		test.deepEqual(Object.keys(results[i]), Object.keys(reqResults[i]));
	}
	test.deepEqual(results, reqResults);
};
exports.tests = {
	'ip validation': function(test) {
		
		var vals = [
			{'reg': 'ETHERNET_IP', 'val': '0.0.0', 'res': false, 'reason': 'IP address validation failed, invalid IP string.'},
			{'reg': 'ETHERNET_IP', 'val': '0', 'res': false, 'reason': 'IP address validation failed, invalid IP string.'},
			{'reg': 'ETHERNET_IP', 'val': 0, 'res': true, 'reason': ''},
			{'reg': 'ETHERNET_IP', 'val': 0xFFFFFFFF, 'res': true, 'reason': ''},
			{'reg': 'ETHERNET_IP', 'val': 0xFFFFFFFFF, 'res': false, 'reason': 'IP address validation failed, invalid IP integer.  Out of range 0 -> 0xFFFFFFFF.'},
			{'reg': 'ETHERNET_IP', 'val': -1, 'res': false, 'reason': 'IP address validation failed, invalid IP integer.  Out of range 0 -> 0xFFFFFFFF.'},
			{'reg': 'ETHERNET_IP', 'val': '192.168.1.1', 'res': true, 'reason': ''},
			{'reg': 'WIFI_IP', 'val': '192.168.1.1', 'res': true, 'reason': ''},
		];
		var results = [];
		var reqResults = [];

		vals.forEach(function(val) {
			results.push(data_parser.validate(val.reg, val.val));
			var regInfo = constants.getAddressInfo(val.reg);
			reqResults.push({
				'register': val.reg,
				'name': regInfo.data.name,
				'address': regInfo.data.address,
				'val': val.val,
				'isValid': val.res,
				'reason': val.reason,
			});
		});
		// console.log('Results', results);
		// console.log('reqResults', reqResults);
		testResults(test, results, reqResults);
		test.done();
	},
	'undefined validator': function(test) {
		var vals = [
			{'reg': 'DAC0', 'val': 1.0},
		];

		var results = [];
		var reqResults = [];

		vals.forEach(function(val) {
			results.push(data_parser.validate(val.reg, val.val));
			var regInfo = constants.getAddressInfo(val.reg);
			reqResults.push({
				'register': val.reg,
				'name': regInfo.data.name,
				'address': regInfo.data.address,
				'val': val.val,
				'isValid': true,
				'reason': '',
			});
		});
		testResults(test, results, reqResults);
		test.done();
	},
};