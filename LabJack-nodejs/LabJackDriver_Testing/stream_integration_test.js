
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
		'ljmBacklog': res.ljmBacklog
	};
	console.log('streamRead result', pResults);
	test.done();
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
			'pRes': false,
			'pErr': false,
			'args': [1000, ['AIN0'], 1000]
		});
	},
	'startStream (again... to cause an error)': function(test) {
		tFunc(test, device, 'streamStart', {
			'pRes': false,
			'pErr': false,
			'args': [1000, ['AIN0'], 1000],
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
	'streamReadx3': function(test) {
		tFunc(test, device, 'streamRead', {
			'pRes': false,
			'pErr': true,
			'onSucc': parseStreamData
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