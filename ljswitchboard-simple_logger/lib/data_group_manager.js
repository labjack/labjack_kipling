

var q = require('q');
var async = require('async');
var vm = require('vm');

function CREATE_DATA_GROUP_MANAGER(options) {
	this.options = options;

	// this.currentDelay = options.group_delay;
	this.currentDelay = 0;

	this.data = {};
	this.completeData = {};

	function createFormattingFunction(funcText, regInfo) {
		// Formatting functions are executed with node.js' vm sandboxing
		// methidology. https://nodejs.org/api/vm.html#vm_vm_runinnewcontext_code_sandbox_filename
		var sandbox = {
			val: 0,
		};
		var context = new vm.createContext(sandbox);
		var script;
		try {
			script = new vm.Script(funcText, {filename: 'format_func.vm'});
		} catch(err) {
			console.error('(data_group_manager.js) Tried to create a bad script', err);
			errors.push(err);
			script = new vm.Script('', {filename: 'format_func.vm'});
		}

		function executeFormatter(val) {
			var retVal;
			sandbox.val = val;
			try {
				// Enforce formatting scripts to finish in less than 50ms.
				script.runInContext(context, {timeout: 500});
				retVal = sandbox.val;
			} catch(err) {
				console.error('(data_group_manager.js) Error running script', err);
				console.error('Error Data', regInfo);
				retVal = val;
			}
			return retVal;
		}
		return executeFormatter;
	}

	var getId = function(deviceSerialNumber, registerName) {
		return deviceSerialNumber.toString() + '_' + registerName.toString();
	};

	var serialNumbers = options.device_serial_numbers;
	for(var i = 0; i < serialNumbers.length; i++) {
		var sn = serialNumbers[i];
		
		this.data[sn] = [];
		this.completeData[sn] = {};

		var registers = options[sn].registers;
		for(var j = 0; j < registers.length; j++) {
			var registerID = getId(sn, registers[j].name);
			this.completeData[sn][registerID] = JSON.parse(JSON.stringify(
				registers[j]
			));
			if(registers[j].format_func) {
				this.completeData[sn][registerID].formatFunc = createFormattingFunction(registers[j].format_func, {'sn': sn, 'reg': registers[j].name});
			}
			if(this.data[sn].indexOf(registers[j].name) < 0) {
				this.data[sn].push(registers[j].name);
			}
		}
	}

	this.getRequiredRegisterData = function() {
		var retData;

		if(self.currentDelay < 0) {
			retData = self.completeData;
		}

		return retData;
	};

	this.getRequiredRegisters = function() {
		var retData;

		if(self.currentDelay < 0) {
			retData = JSON.parse(JSON.stringify(self.data));
		}

		return retData;
	};

	this.getRequiredData = function() {
		var retData;
		// decrement the current delay counter
		self.currentDelay -= 1;

		if(self.currentDelay < 0) {
			retData = {
				'registerData': self.getRequiredRegisterData(),
				'registers': self.getRequiredRegisters(),
			};
			self.currentDelay = options.group_delay;
		}

		return retData;
	};
	var self = this;
}


exports.create = function(options) {
	return new CREATE_DATA_GROUP_MANAGER(options);
};
