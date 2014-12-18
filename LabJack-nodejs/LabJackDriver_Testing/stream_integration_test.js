
var labjack_nodejs = require('../lib/labjack_nodejs');
var device = new labjack_nodejs.device();


var tFunc = function(test, obj, func, options) {
	var args;
	var pRes;
	var pErr;
	if(options) {
		if(options.args) {
			args = options.args;
		}
		if(options.pRes) {
			pRes = options.pRes;
		}
		if(options.pErr) {
			pErr = options.pErr;
		}
		if(options.onSucc) {
			test.onSucc = options.onSucc;
		}
		if(options.onErr) {
			test.onErr = options.onErr;
		}
	}
	test.debugStep = false;
	if(pRes) {
		test.debugStep = true;
	}
	test.debugError = false;
	if(pErr) {
		test.debugError = true;
	}
	try {
		if((args === undefined) ||(args === null)) {
			obj[func](
				tErr(test, func + ' Error'),
				tSucc(test, func + ' Success')
			);
		} else if(args.length === 0) {
			obj[func](
				tErr(test, func + ' Error'),
				tSucc(test, func + ' Success')
			);
		} else if(args.length === 1) {
			obj[func](
				args[0],
				tErr(test, func + ' Error'),
				tSucc(test, func + ' Success')
			);
		} else if(args.length === 2) {
			obj[func](
				args[0], args[1],
				tErr(test, 'Function: ' + func + ' Error'),
				tSucc(test, 'Function: ' + func + ' Success')
			);
		} else if(args.length === 3) {
			obj[func](
				args[0], args[1], args[2],
				tErr(test, 'Function: ' + func + ' Error'),
				tSucc(test, 'Function: ' + func + ' Success')
			);
		} else {
			console.log('in tFunc, function Not Supported, to many args');
			test.ok(false);
		}
	} catch(err) {
		console.log('Caught an error in tFunc:', func, err);
		test.ok(false, 'Error caught calling function: ' + func);
		test.done();
	}
};
var tErr = function(test, message) {
	var errFunc = function(err) {
		if(test.debugError) {
			console.log('* in tErr |', message, '| err:', err);
		}
		if(test.onErr) {
			test.onErr(err, test);
		} else {
			test.ok(false, 'Error reported in tErr: ' + err.toString());
			test.done();
		}
	};
	return errFunc;
};
var tSucc = function(test, message, callback) {
	var sucFunc = function(res) {
		if(test.debugStep) {
			console.log('* in tSucc |', message, '| result:', res);
		}
		test.ok(true);
		if(test.onSucc) {
			test.onSucc(res, test);
		} else {
			test.done();
		}
	};
	return sucFunc;
};
var parseStreamData = function(res, test) {
	var results = [];
	var resultsBuff = res.data;
	var offsetD = 0;
	var numVals = resultsBuff.length/8;
	var i = 0;
	for(i = 0; i < numVals; i++) {
		results.push(resultsBuff.readDoubleLE(offsetD));
	}

	var pResults = {
		'numVals': numVals,
		'deviceBacklog': res.deviceBacklog,
		'ljmBacklog': res.ljmBacklog,
		'dataOffset': res.dataOffset,
	};
	// console.log('streamRead result', pResults);
	test.done();
};
var getParseStreamData = function(options) {
	var parseStreamData = function(res, test) {
		var results = [];
		var resultsBuff = res.data;
		var offsetD = 0;
		var numVals = resultsBuff.length/8;
		var i = 0;
		for(i = 0; i < numVals; i++) {
			results.push(resultsBuff.readDoubleLE(offsetD));
		}

		var pResults = {
			'numVals': numVals,
			'deviceBacklog': res.deviceBacklog,
			'ljmBacklog': res.ljmBacklog,
			'dataOffset': res.dataOffset,
		};
		if(options) {
			if(options.callback) {
				options.callback(test, pResults);
			}
		} else {
			test.done();
		}
	};
	return parseStreamData;
};



var streamScansPerRead = 2000;
var streamScanRate = 1000;
var refreshDelay = streamScansPerRead/streamScanRate;
var refreshRate = streamScanRate/streamScansPerRead;
console.log("refreshRate", refreshDelay, refreshRate);
var startHRTime = null;
var endHRTime = null;
var getHRDiff = function(starting, ending) {
	var res = [0,0];
	startMS = starting[0] * 1000 + starting[1]/1000000;
	endMS = ending[0] * 1000 + ending[1]/1000000;
	return (endMS - startMS).toFixed(3);
};
exports.basic_test = {
	'openDevice': function(test) {
		tFunc(test, device, 'open');
	},
	'getHandleInfo': function(test) {
		tFunc(test, device, 'getHandleInfo', {
			'pRes': false,
			'onSucc': function(res, test) {
				test.done();
			}
		});
	},
	'configure dac': function(test) {
		tFunc(test, device, 'write', {
			'args': ['DAC0', 1.2]
		});
	},
	'startStream': function(test) {
		tFunc(test, device, 'streamStart', {
			'pRes': true,
			'pErr': false,
			'args': [streamScansPerRead, ['AIN0'], streamScanRate]
		});
	},
	'startStream (again... to cause an error)': function(test) {
		tFunc(test, device, 'streamStart', {
			'pRes': false,
			'pErr': false,
			'args': [streamScansPerRead, ['AIN0'], streamScanRate],
			'onErr': function(err, test) {
				test.ok(true);
				var expectedMsg = 'streamStart: stream already running';
				test.strictEqual(err, expectedMsg, 'bad error message');
				test.done();
			},
			'onSucc': function(res, test) {
				test.ok(false,'secondary streamStart should have failed');
				test.done();
			}
		});
	},
	'streamRead': function(test) {
		tFunc(test, device, 'streamRead', {
			'pRes': false,
			'pErr': true,
			'onSucc': parseStreamData
		});
	},
	'streamReadx2': function(test) {
		tFunc(test, device, 'streamRead', {
			'pRes': false,
			'pErr': true,
			'onSucc': parseStreamData
		});
	},
	/**
	 * streamReadx3 checks two things, it makes sure that javascript delays
	 * properly allowing LJM to buffer data and makes sure that the setTimeout
	 * function doesn't cause for weird timing issues.  In combination with
	 * streamReadx4 it also verifies that LJM will return data +- instantly
	 * if there is a backlog of one full scan.
	**/
	'streamReadx3': function(test) {
		// Delay read for two time periods to make sure that +- 1 interval's
		// worth of data has been stored by LJM.
		var delay = 3 * refreshDelay * 1000;
		setTimeout(function() {
			tFunc(test, device, 'streamRead', {
				'pRes': false,
				'pErr': true,
				'onSucc': getParseStreamData({'callback': function(test, res) {
					// console.log('streamReadx3', res);
					var isBacklogExpected = false;

					// TODO: Changing to "2 * " will sometimes break test b/c ljmBacklog doesn't get filled enough during the delay period
					if(res.ljmBacklog > (1 * streamScansPerRead)) {				
						isBacklogExpected = true;
					} else {
						console.log("ljmBacklog is to low");
					}
					if(res.ljmBacklog > (3 * streamScansPerRead)) {
						console.log("ljmBacklog is to high");
						isBacklogExpected = false;
					}
					test.ok(
						isBacklogExpected, 
						'ljmBacklog did not get affected properly: ' +
						res.ljmBacklog.toString()
					);
					startHRTime = process.hrtime();
					test.done();
				}})
			});
		}, delay);
		
	},
	/**
	 * In combination with streamReadx3 test, here we make sure that if LJM
	 * has buffered data it returns +- instantly after calling streamRead with
	 * more data.
	 * 
	 * Results show that it takes roughly 1.5ms to read 1k samples.
	 * Note: There is a larve variance between results.
	 * Time for 1k: 4.00ms
	 * Time for 2k: 5.50ms | 5.39ms | 5.55ms | 5.61ms 
	 * Time for 3k: 7.00ms
	 * Time for 4k: 8.44ms | 8.45ms | 8.42ms | 9.62ms
	 * Time for 5k: 10.00ms
	 * To get results, change the "streamScansPerRead" variable.
	 *
	 * Results w/o the .js for loop for processing;
	 * Time for 2k: 4.79ms | 5.08ms | 4.76ms | 4.96ms
	**/
	'streamReadx4': function(test) {
		tFunc(test, device, 'streamRead', {
			'pRes': false,
			'pErr': true,
			'onSucc': getParseStreamData({'callback': function(test, res) {
				endHRTime = process.hrtime();
				var diff = getHRDiff(startHRTime, endHRTime);
				console.log('streamReadx4', diff);
				// console.log('streamReadx4', res);
				var isTimeDiffValid = false;
				if(diff < (refreshDelay * 1000 / 2)) {
					isTimeDiffValid = true;
				}
				test.ok(
					isTimeDiffValid,
					'timeDiff between streamReads is invalid: ' +
					diff.toString()
				);
				test.done();
			}})
		});
	},
	'stopStream': function(test) {
		tFunc(test, device, 'streamStop', {
			'pRes': false,
			'pErr': false
		});
	},
	'closeDevice': function(test) {
		tFunc(test, device, 'close');
	}
};