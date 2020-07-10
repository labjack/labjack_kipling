

var app = require('./lib/app_router/app_router');

app.addEndpoints([{
	'cmd': 'pwd',
	'description': 'Gets the current directory of the process.',
	'func': function(argArray, win, cb) {
		var message = 'Current Directory:\r\n';
		message += process.cwd() + '\r\n';
		win.setResult(message);
		cb();
	}
}, {
	'cmd': 'verify',
	'description': 'Verify a logger config file. Ex: "verify_config [path_to_file]"',
	'func': function(argArray, win, cb) {
		win.setResult('Checking File: ' + JSON.stringify(argArray, null, 2));
		cb();
	}
}]);

app.start();


// var endpoints = {};


// endpoints.help = {
// 	'description': 'These are the available commands:',
// 	'func': 
// };