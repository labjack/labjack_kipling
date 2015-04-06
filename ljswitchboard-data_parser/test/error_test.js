
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
			{'reg': 'FIO1', 'err': 12, 'defaultVal': 0, 'lastVal': 0},
			{'reg': 'AIN0_RANGE', 'err': 12, 'defaultVal': 10, 'lastVal': 10},
			{'reg': 'AIN0_EF_INDEX', 'err': 12, 'defaultVal': 0, 'lastVal': 0},
		];
		/*
		Most of the default values listed in the .json file seem like "valid" 
		invalid values to use except for a few.  Should use the defined error 
		vals if there is one (to allow defaults to be over-ridden), and then
		either use the default in the modbus map (if there is one) or use the
		default value defined in the ljm_driver_constants project.
		*/
		// console.log('READ MY COMMENT!!!');
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
				'defaultValue': data_parser.parseResult(val.reg, val.defaultVal),
				'lastValue': data_parser.parseResult(val.reg, val.lastVal),
				'errorCode': val.err,
				'errorString': errorInfo.string,
				'err': val.err
			});
		});
		// console.log('Results', results);
		// console.log('reqResults', reqResults);
		var i, j;
		for(j = 0; j < results.length; j++) {
			// console.log('**********************')
			var resultKeys = Object.keys(results[j]);
			var reqResultKeys = Object.keys(reqResults[j]);
			for(i = 0; i < resultKeys.length; i++) {
				if(resultKeys[i] !== reqResultKeys[i]) {
					console.log('Key doesnt match', resultKeys[i], reqResultKeys[i]);
				}
				if(results[j][resultKeys[i]] !== reqResults[j][resultKeys[i]]) {
					// console.log('Register:',resultKeys[i]);
					// console.log('  - res',results[j][resultKeys[i]]);
					// console.log('  - req', reqResults[j][resultKeys[i]]);
				}
				test.deepEqual(results[j][resultKeys[i]], reqResults[j][resultKeys[i]], 'Register:' + resultKeys[i])
			}
		}
		for(i = 0; i < results.length; i++) {
			test.deepEqual(Object.keys(results[i]), Object.keys(reqResults[i]));
		}
		// test.deepEqual(results, reqResults);
		test.done();
	},
	'multiple-read errors': function(test) {
		test.done();
		return;
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
			{'addrs': ['FIO1','FIO1','AIN1'], 'err': 12, 'defaultVals': [0,0,-9999], 'lastVals': [-1,-1,-9999]},
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
					'defaultValue': data_parser.parseResult(address, val.defaultVals[i]),
					'lastValue': data_parser.parseResult(address, val.lastVals[i]),
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