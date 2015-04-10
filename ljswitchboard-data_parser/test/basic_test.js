
var data_parser = require('../lib/data_parser');
var modbus_map = require('ljswitchboard-modbus_map');
var constants = modbus_map.getConstants();


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
	'check IP registers (fail) - encode': function(test) {
		var results = [
			data_parser.encodeValue('WIFI_IP', 0),
			data_parser.encodeValue('WIFI_IP', 1),
			data_parser.encodeValue('WIFI_IP', 256),
			data_parser.encodeValue('WIFI_IP', 65536),
			data_parser.encodeValue('WIFI_IP', 16777216),
			data_parser.encodeValue('WIFI_IP', 3232235983),
			data_parser.encodeValue('WIFI_IP', 4294967295),
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
		var testVals = [
			{'val': 0, 'ip': '0.0.0.0'},
			{'val': 0, 'ip': '0.0.0.0'},
			{'val': 1, 'ip': '0.0.0.1'},
			{'val': 256, 'ip': '0.0.1.0'},
			{'val': 65536, 'ip': '0.1.0.0'},
			{'val': 16777216, 'ip': '1.0.0.0'},
			{'val': 3232235983, 'ip': '192.168.1.207'},
			{'val': 4294967295, 'ip': '255.255.255.255'},
		];

		var results = [];
		var reqResults = [];
		var ipRegisters = [
			'WIFI_IP',
			'WIFI_SUBNET',
			'WIFI_GATEWAY',
			'WIFI_IP_DEFAULT',
			'WIFI_SUBNET_DEFAULT',
			'WIFI_GATEWAY_DEFAULT',
			'ETHERNET_IP',
			'ETHERNET_SUBNET',
			'ETHERNET_GATEWAY',
			'ETHERNET_DNS',
			'ETHERNET_ALTDNS',
			'ETHERNET_IP_DEFAULT',
			'ETHERNET_SUBNET_DEFAULT',
			'ETHERNET_GATEWAY_DEFAULT',
			'ETHERNET_DNS_DEFAULT',
			'ETHERNET_ALTDNS_DEFAULT',

		];

		testVals.forEach(function(testVal) {
			ipRegisters.forEach(function(ipRegister) {
				var isReal = false;
				if(testVal.val !== 0) {
					isReal = true;
				}
				results.push(data_parser.parseResult(ipRegister, testVal.val));
				var text = 'Not Connected';
				if(isReal) {
					text = testVal.ip;
				}
				reqResults.push({
					'register': ipRegister,
					'name': constants.getAddressInfo(ipRegister).data.name,
					'address': constants.getAddressInfo(ipRegister).data.address,
					'res': testVal.val,
					'str': testVal.ip,
					'val': testVal.ip,
					'isReal': isReal,
					'text': text,
				});
			});
		});
		test.deepEqual(results, reqResults);
		var resultsLength = results.length;
		var reqResultsLength = reqResults.length;
		test.strictEqual(resultsLength, reqResultsLength, 'Lengths must be equal');
		var i;
		for(i = 0; i < results.length; i++) {
			test.deepEqual(results[i], reqResults[i], 'result: ' + i.toString() + 'failed');
		}
		test.done();
	},
	'check HARDWARE_INSTALLED -decode': function(test) {
		// Origional values & results w/ proper bit-masks (If there wasn't a wifi issue);
		var vals = [
			{'val': 1, 'sdCard': false, 'rtc': false, 'wifi': false, 'adc': true, 'isPro': true},
			{'val': 2, 'sdCard': false, 'rtc': false, 'wifi': true, 'adc': false, 'isPro': true},
			{'val': 3, 'sdCard': false, 'rtc': false, 'wifi': true, 'adc': true, 'isPro': true},
			{'val': 4, 'sdCard': false, 'rtc': true, 'wifi': false, 'adc': false, 'isPro': true},
			{'val': 8, 'sdCard': true, 'rtc': false, 'wifi': false, 'adc': false, 'isPro': false},
			{'val': 9, 'sdCard': true, 'rtc': false, 'wifi': false, 'adc': true, 'isPro': true},
		];

		// Values w/ wifi fix:
		// var vals = [
		// 	{'val': 1, 'sdCard': false, 'rtc': false, 'wifi': true, 'adc': true, 'isPro': true},
		// 	{'val': 2, 'sdCard': false, 'rtc': false, 'wifi': true, 'adc': false, 'isPro': true},
		// 	{'val': 3, 'sdCard': false, 'rtc': false, 'wifi': true, 'adc': true, 'isPro': true},
		// 	{'val': 4, 'sdCard': false, 'rtc': true, 'wifi': true, 'adc': false, 'isPro': true},
		// 	{'val': 8, 'sdCard': true, 'rtc': false, 'wifi': false, 'adc': false, 'isPro': false},
		// 	{'val': 9, 'sdCard': true, 'rtc': false, 'wifi': true, 'adc': true, 'isPro': true},
		// 	{'val': 15, 'sdCard': true, 'rtc': true, 'wifi': true, 'adc': true, 'isPro': true},
		// ];

		var results = [];
		var reqResults = [];

		vals.forEach(function(val) {
			var reg = 'HARDWARE_INSTALLED';
			var dt = 'T7';
			var subClass = '';
			if(val.isPro) {
				subClass = '-Pro';
			}
			results.push(data_parser.parseResult(reg, val.val));
			reqResults.push({
				'register': reg,
				'name': constants.getAddressInfo(reg).data.name,
				'address': constants.getAddressInfo(reg).data.address,
				'res': val.val,
				'val': val.val,
				'highResADC': val.adc,
				'wifi': val.wifi,
				'rtc': val.rtc,
				'sdCard': val.sdCard,
				'subclass': subClass,
				'isPro': val.isPro,
				'productType': dt+subClass,
			});
		});

		var resKeys = Object.keys(results[0]);
		var reqKeys = Object.keys(reqResults[0]);
		var i;
		for(i = 0; i < resKeys.length; i++) {
			if(resKeys[i] !== reqKeys[i]) {
				console.log('HERE', i, resKeys[i], reqKeys[i]);
			}
		}
		test.deepEqual(resKeys, reqKeys);
		test.deepEqual(results, reqResults);
		test.done();
	},
	'check DGT_INSTALLED_OPTIONS -decode': function(test) {
		var vals = [
			{'val': 2, 'temperature': true, 'light': true, 'humidity': false, 'subclass': '-TL'},
			{'val': 3, 'temperature': true, 'light': true, 'humidity': true, 'subclass': '-TLH'},
		];
		var results = [];
		var reqResults = [];

		vals.forEach(function(val) {
			var reg = 'DGT_INSTALLED_OPTIONS';
			var dt = 'Digit';
			var subClass = val.subclass;
			results.push(data_parser.parseResult(reg, val.val));
			reqResults.push({
				'register': reg,
				'name': constants.getAddressInfo(reg).data.name,
				'address': constants.getAddressInfo(reg).data.address,
				'res': val.val,
				'val': val.val,
				'temperature': val.temperature,
				'light': val.light,
				'humidity': val.humidity,
				'subclass': subClass,
				'productType': dt+subClass,
			});
		});

		var resKeys = Object.keys(results[0]);
		var reqKeys = Object.keys(reqResults[0]);
		var i;
		for(i = 0; i < resKeys.length; i++) {
			if(resKeys[i] !== reqKeys[i]) {
				console.log('HERE', i, resKeys[i], reqKeys[i]);
			}
		}
		test.deepEqual(resKeys, reqKeys, 'Keys are not equal');
		test.deepEqual(results, reqResults, 'results are not equal');
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
			var isConnected = false;
			if(val == 2900) {
				isConnected = true;
			}
			return {
				'register': 'WIFI_STATUS',
				'name': 'WIFI_STATUS',
				'address': 49450,
				'res': parseInt(val,10),
				'val': wifiData[val],
				'str': wifiData[val],
				'isConnected': isConnected
			};
		});
		test.deepEqual(results, reqResults);

		test.done();
	},
	'check WIFI_RSSI': function(test) {
		var imgs = [
			'wifiRSSI-0',
			'wifiRSSI-1',
			'wifiRSSI-2',
			'wifiRSSI-3',
			'wifiRSSI-4',
			'wifiRSSI-not-active'
		];
		var vals = [
			{'val': -40, 'img': imgs[4]},
			{'val': -45, 'img': imgs[4]},
			{'val': -48, 'img': imgs[3]},
			{'val': -62, 'img': imgs[2]},
			{'val': -70, 'img': imgs[1]},
			{'val': -78, 'img': imgs[0]},
			{'val': -85, 'img': imgs[0]},
			{'val': -201, 'img': imgs[5]},
		];
		var results = [];
		var reqResults = [];
		vals.forEach(function(val) {
			var reg = 'WIFI_RSSI';
			results.push(data_parser.parseResult(reg, val.val));
			reqResults.push({
				'register': reg,
				'name': constants.getAddressInfo(reg).data.name,
				'address': constants.getAddressInfo(reg).data.address,
				'res': val.val,
				'val': val.val,
				'unit': 'dB',
				'imageName': val.img,
				'str': val.val.toString() + 'dB',
			});
		});

		test.deepEqual(results, reqResults);
		test.done();
	},
	'check FLOAT32 registers for rounding': function(test) {
		test.done();
	},
	'check AINx registers for high-precision rounding': function(test) {
		var ainValues = [
			{'res': 1, 'val': 1, 'rounded': 1, 'unit': 'V'},
			{'res': 1.123456789, 'val': 1.123457, 'rounded': 1.123457, 'unit': 'V'},
			{'res': 0.0123456789012, 'val': 0.012346, 'rounded': 12.345679, 'unit': 'mV'},
		];

		var results = ainValues.map(function(ainValue) {
			return data_parser.parseResult('AIN0', ainValue.res);
		});
		var reqResults = ainValues.map(function(ainValue) {
			return {
				'register': 'AIN0',
				'name': 'AIN0',
				'address': 0,
				'res': ainValue.res,
				'val': ainValue.val,
				'rounded': ainValue.rounded,
				'unit': ainValue.unit,
				'str': ainValue.rounded.toFixed(6),
			};
		});
		// console.log('Results', results);
		test.deepEqual(results, reqResults, 'AINx Values are bad');
		test.done();
	},
	'check DACx registers for rounding': function(test) {
		// DAC registers to test:
		var registers = ['DAC0', 'DAC1', 1000, 1002];

		registers.forEach(function(reg) {
			var dacValues = [
				{'res': 1, 'val': 1},
				{'res': 1.123456789, 'val': 1.123},
				{'res': 0.0123456789012, 'val': 0.012},
			];

			var results = dacValues.map(function(dacValue) {
				return data_parser.parseResult(reg, dacValue.res);
			});
			var reqResults = dacValues.map(function(dacValue) {
				return {
					'register': reg,
					'name': constants.getAddressInfo(reg).data.name,
					'address': constants.getAddressInfo(reg).data.address,
					'res': dacValue.res,
					'val': dacValue.val,
					'unit': 'V',
					'str': dacValue.val.toFixed(3),
				};
			});
			test.deepEqual(results, reqResults, 'DACx Values are bad');
		});
		test.done();
	},
	'check _VERSION Parsers': function(test) {
		var vals = [
			{'reg': 'FIRMWARE_VERSION', 'val': 1.01234567, 'res': 1.0123},
			{'reg': 'BOOTLOADER_VERSION', 'val': 1.01234567, 'res': 1.0123},
			{'reg': 'WIFI_VERSION', 'val': 1.01234567, 'res': 1.0123},
		];
		var results = [];
		var reqResults = [];
		vals.forEach(function(val) {
			var reg = val.reg;
			results.push(data_parser.parseResult(reg, val.val));
			reqResults.push({
				'register': reg,
				'name': constants.getAddressInfo(reg).data.name,
				'address': constants.getAddressInfo(reg).data.address,
				'res': val.val,
				'val': val.res,
				'str': val.res.toString()
			});
		});

		// console.log('Results', results);
		test.deepEqual(results, reqResults);
		test.done();
	},
	'check TEMPERATURE_DEVICE_K': function(test) {
		var vals = [
			{'reg': 'TEMPERATURE_DEVICE_K', 'val': 303.123456, 'res': 303.1235}
		];
		var results = [];
		var reqResults = [];
		vals.forEach(function(val) {
			var reg = val.reg;
			results.push(data_parser.parseResult(reg, val.val));
			reqResults.push({
				'register': reg,
				'name': constants.getAddressInfo(reg).data.name,
				'address': constants.getAddressInfo(reg).data.address,
				'res': val.val,
				'val': val.res,
				'str': val.res.toString(),
				'unit': 'K'
			});
		});

		// console.log('Results', results);
		test.deepEqual(results, reqResults);
		test.done();
	},
	'check CURRENT_SOURCE_x_CAL_VALUE': function(test) {
		var vals = [
			{'reg': 'CURRENT_SOURCE_10UA_CAL_VALUE', 'val': 0.0001981853274, 'res': 198.185},
			{'reg': 'CURRENT_SOURCE_200UA_CAL_VALUE', 'val': 0.0001002213502, 'res': 100.221}
		];
		var results = [];
		var reqResults = [];
		vals.forEach(function(val) {
			var reg = val.reg;
			results.push(data_parser.parseResult(reg, val.val));
			reqResults.push({
				'register': reg,
				'name': constants.getAddressInfo(reg).data.name,
				'address': constants.getAddressInfo(reg).data.address,
				'res': val.val,
				'val': val.res,
				'str': val.res.toString(),
				'unit': 'uA'
			});
		});

		// console.log('Results', results);
		test.deepEqual(results, reqResults);
		test.done();
	},
	'check POWER_ registers for text output': function(test) {
		test.done();
	},
	'check undefined register - parse': function(test) {
		// Make sure that no parsers get run but some basic information is added
		var cmds = [
			{'reg': 9000, 'val': 0},
			{'reg': 'AIN0_EF_INDEX', 'val': 0},
			{'reg': 'DEVICE_NAME_DEFAULT', 'val': 'MY TEST STRING'},
		];


		var results = cmds.map(function(cmd) {
			return data_parser.parseResult(cmd.reg, cmd.val);
		});
		var reqResults = cmds.map(function(cmd) {
			return {
				'register': cmd.reg,
				'name': constants.getAddressInfo(cmd.reg).data.name,
				'address': constants.getAddressInfo(cmd.reg).data.address,
				'res': cmd.val,
				'val': cmd.val
			};
		});

		// console.log('Results', results);
		test.deepEqual(results, reqResults);
		test.done();
	},
	'check undefined register - encode': function(test) {
		var cmds = [
			{'reg': 'HARDWARE_INSTALLED', 'val': 15},
			{'reg': 'DEVICE_NAME_DEFAULT', 'val': '1'},
		];
		var results = cmds.map(function(cmd) {
			return data_parser.encodeValue(cmd.reg, cmd.val);
		});
		var reqResults = cmds.map(function(cmd) {
			return cmd.val;
		});
		test.deepEqual(results, reqResults);
		test.done();
	},
	'check undefined register (b) - encode': function(test) {
		var cmds = [
			{'reg': 'HARDWARE_INSTALLED', 'val': 15},
			{'reg': 'DEVICE_NAME_DEFAULT', 'val': '1'},
		];
		var results = cmds.map(function(cmd) {
			return data_parser.encodeValue(cmd.reg, cmd.val, 7);
		});
		var reqResults = cmds.map(function(cmd) {
			return cmd.val;
		});
		test.deepEqual(results, reqResults);
		test.done();
	},
};