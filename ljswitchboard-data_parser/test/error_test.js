
var data_parser = require('../lib/data_parser');
var modbus_map = require('ljswitchboard-modbus_map');
var constants = modbus_map.getConstants();


exports.tests = {
	'single-read errors': function(test) {
		var options = {
			'valueCache': {
				'FIO0': 1
			},
			'customValues': {
				'FIO1': 0
			}
		};
		var vals = [
			{'reg': 'AIN0', 'err': 12, 'defaultVal': -9999, 'lastVal': -9999},
			{'reg': 'DIO0', 'err': 12, 'defaultVal': -1, 'lastVal': -1},
			{'reg': 'FIO0', 'err': 12, 'defaultVal': -1, 'lastVal': 1},
			{'reg': 'FIO1', 'err': 12, 'defaultVal': 0, 'lastVal': -1},
		];
		var results = [];
		var reqResults = [];

		vals.forEach(function(val) {
			results.push(data_parser.parseError(val.reg, val.err, options));
			var regInfo = constants.getAddressInfo(val.reg);
			var errorInfo = constants.getErrorInfo(val.err);
			reqResults.push({
				'register': val.reg,
				'name': regInfo.data.name,
				'address': regInfo.data.address,
				'defaultValue': val.defaultVal,
				'lastValue': val.lastVal,
				'errorCode': val.err,
				'errorString': errorInfo.string,
				'err': val.err
			});
		});
		// console.log('Results', results);
		// console.log('reqResults', reqResults);
		var i;
		var resultKeys = Object.keys(results[0]);
		var reqResultKeys = Object.keys(reqResults[0]);
		for(i = 0; i < resultKeys.length; i++) {
			if(resultKeys[i] !== reqResultKeys[i]) {
				console.log('Key doesnt match', resultKeys[i], reqResultKeys[i]);
			}
		}
		for(i = 0; i < results.length; i++) {
			test.deepEqual(Object.keys(results[i]), Object.keys(reqResults[i]));
		}
		test.deepEqual(results, reqResults);
		test.done();
	},
	'multiple-read errors': function(test) {
		var options = {
			'valueCache': {
				'FIO0': 1
			},
			'customValues': {
				'FIO1': 0
			}
		};
		var vals = [
			{'addrs': ['AIN0','AIN0'], 'err': 12, 'defaultVals': [-9999,-9999], 'lastVals': [-9999,-9999]},
			{'addrs': ['DIO0','DIO0'], 'err': 12, 'defaultVals': [-1,-1], 'lastVals': [-1,-1]},
			{'addrs': ['FIO0','FIO0'], 'err': 12, 'defaultVals': [-1,-1], 'lastVals': [1,1]},
			{'addrs': ['FIO1','FIO1'], 'err': 12, 'defaultVals': [0,0], 'lastVals': [-1,-1]},
		];
		var results = [];
		var reqResults = [];
		vals.forEach(function(val) {
			results.push(data_parser.parseErrorMultiple(
				val.addrs,
				val.err,
				options
			));
			var data = [];
			val.addrs.forEach(function(address, i) {
				var regInfo = constants.getAddressInfo(address);
				data.push({
					'register': address,
					'name': regInfo.data.name,
					'address': regInfo.data.address,
					'defaultValue': val.defaultVals[i],
					'lastValue': val.lastVals[i]
				});
			});
			var errorInfo = constants.getErrorInfo(val.err);
			reqResults.push({
				'data': data,
				'errorCode': val.err,
				'errorString': errorInfo.string,
				'err': val.err
			});
		});
		test.deepEqual(results, reqResults);
		test.done();
	},
};