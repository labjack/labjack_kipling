


var q = require('q');
var appWindow = require('../display/logger_display');

var endpoints = {};

var addEndpoint = function(newCommand) {
	endpoints[newCommand.cmd] = newCommand;
};
var addEndpoints = function(newCommands) {
	newCommands.forEach(addEndpoint);
};

// Add default endpoints
addEndpoints([{
	'cmd': 'help',
	'description': 'Lists the available commands.',
	'func': function(argArray, win, cb) {
		var keys = Object.keys(endpoints);
		var message = 'Available Commands:\r\n';
		keys.forEach(function(key) {
			var cmdName = endpoints[key].cmd;
			var cmdDescription = endpoints[key].description;
			message += ' - ' + cmdName + ': ' + cmdDescription + '\r\n';
		});
		win.setResult(message);
		cb();
	}
}]);

exports.addEndpoint = addEndpoint;
exports.addEndpoints = addEndpoints;

function CREATE_CONSUMER() {
	this.execQueue = [];
	this.isRunning = false;

	this.executeStep = function(data) {
		var defered = q.defer();

		// Get rid of \r\n characters.
		data = data.split('\r\n').join('');

		var splitData = data.split(' ');
		var instructionName = splitData.shift();
		if(endpoints[instructionName]) {
			executeCommand = true;
			appWindow.setActiveInstruction(instructionName);
			
		} else {
			appWindow.setActiveInstruction('invalid instruction: ' + instructionName);
			
			// The endpoint is invalid, print out the available endpoints
			instructionName = 'help';
			executeCommand = true;
		}

		if(executeCommand) {
			try {
				endpoints[instructionName].func(splitData, appWindow, function() {
					defered.resolve();
				});
			} catch(err) {
				appWindow.setResult('Error Executing...' + err.toString());
				defered.resolve();
			}
		}
		return defered.promise;
	};

	this.handleStepSuccess = function() {
		self.isRunning = false;
		self.runNext();
	};
	this.handleStepError = function() {
		self.isRunning = false;
		self.runNext();
	};

	this.runNext = function() {
		if(self.execQueue.length > 0) {
			if(!self.isRunning) {
				self.isRunning = true;
				var currentOp = self.execQueue.shift();
				self.executeStep(currentOp)
				.then(self.handleStepSuccess, self.handleStepError);
			}
		}
	};

	this.addToQueue = function(data) {
		self.execQueue.push(data);
		self.runNext();
	};

	var self = this;
}

function CREATE_PRODUCER(consumer) {

	this.onReadableInput = function () {
		var chunk = process.stdin.read();
		if (chunk !== null) {
			// process.stdout.write('data: ' + chunk);
			consumer.addToQueue(chunk);
		}
	};
	this.onEndStream = function () {
		process.stdout.write('end');
	};

	var self = this;

	process.stdin.setEncoding('utf8');
	process.stdin.on('readable', self.onReadableInput);
	process.stdin.on('end', self.onEndStream);
	// var stdin = process.openStdin(); 
	// require('tty').setRawMode(true);
	// stdin.on('keypress', function (chunk, key) {
	// 	process.stdout.write('Get Chunk: ' + chunk + '\n');
	// 	if (key && key.ctrl && key.name == 'c') {
	// 		process.exit();
	// 	}
	// });
}


var app_producer;
var app_consumer;

exports.start = function() {

	app_consumer = new CREATE_CONSUMER();
	app_producer = new CREATE_PRODUCER(app_consumer);

};