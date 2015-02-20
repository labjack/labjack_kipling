
var data_parser = require('../lib/data_parser');


exports.tests = {
	'check IP registers - encode': function(test) {
		var results = [
			data_parser.encodeValue('WIFI_IP', '0.0.0.0'),
			data_parser.encodeValue('WIFI_IP', '0.0.0.1'),
			data_parser.encodeValue('WIFI_IP', '0.0.1.0'),
			data_parser.encodeValue('WIFI_IP', '0.1.0.0'),
			data_parser.encodeValue('WIFI_IP', '1.0.0.0'),
			data_parser.encodeValue('WIFI_IP', '192.168.1.207'),
			data_parser.encodeValue('WIFI_IP', '255.255.255.255'),
		];
		var reqResults = [
			0,
			1,
			256,
			65536,
			16777216,
			3232235983,
			4294967295
		];
		test.deepEqual(results, reqResults);
		test.done();
	},
	'check IP registers - decode': function(test) {
		var results = [
			data_parser.parseResult('WIFI_IP', 0),
			data_parser.parseResult('WIFI_IP', 1),
			data_parser.parseResult('WIFI_IP', 256),
			data_parser.parseResult('WIFI_IP', 65536),
			data_parser.parseResult('WIFI_IP', 16777216),
			data_parser.parseResult('WIFI_IP', 3232235983),
			data_parser.parseResult('WIFI_IP', 4294967295),
		];
		var reqResults = [
			{'address': 'WIFI_IP', 'res': 0, 'str': '0.0.0.0'},
			{'address': 'WIFI_IP', 'res': 1, 'str': '0.0.0.1'},
			{'address': 'WIFI_IP', 'res': 256, 'str': '0.0.1.0'},
			{'address': 'WIFI_IP', 'res': 65536, 'str': '0.1.0.0'},
			{'address': 'WIFI_IP', 'res': 16777216, 'str': '1.0.0.0'},
			{'address': 'WIFI_IP', 'res': 3232235983, 'str': '192.168.1.207'},
			{'address': 'WIFI_IP', 'res': 4294967295, 'str': '255.255.255.255'},
		];
		test.deepEqual(results, reqResults);
		test.done();
	},
	'check HARDWARE_INSTALLED -decode': function(test) {
		var res = data_parser.parseResult('HARDWARE_INSTALLED', 3);
		// console.log('Result', res);
		test.done();
	},
	'check FIRMWARE_VERSION - decode': function(test) {
		test.done();
	},
	'check WIFI_STATUS - decode': function(test) {
		var wifiData = {
			2900: 'Associated',
			2901: 'Associating',
			2902: 'Association Failed',
			2903: 'Un-Powered',
			2904: 'Booting Up',
			2905: 'Could Not Start',
			2906: 'Applying Settings',
			2907: 'DHCP Started',
			2908: 'Unknown',
			2909: 'Other'
		};
		var vals = Object.keys(wifiData);

		var results = vals.map(function(val) {
			return data_parser.parseResult('WIFI_STATUS', parseInt(val, 10));
		});

		var reqResults = vals.map(function(val) {
			return {'address': 'WIFI_STATUS', 'res': parseInt(val,10), 'str': wifiData[val]};
		});
		test.deepEqual(results, reqResults);

		test.done();
	},
	'check FLOAT32 registers for rounding': function(test) {
		test.done();
	},
	'check AINx registers for high-precision rounding': function(test) {
		var ainValues = [
			{'val': 1, 'rounded': 1, 'unit': 'V'},
			{'val': 1.1234567, 'rounded': 1.1234567, 'unit': 'V'},
			{'val': 0.0123456, 'rounded': 0.0123456, 'unit': 'V'},
		];

		var results = ainValues.map(function(ainValue) {
			return data_parser.parseResult('AIN0', ainValue.val);
		});
		// console.log('Results', results);
		test.done();
	},
	'check POWER_ registers for text output': function(test) {
		test.done();
	}
};