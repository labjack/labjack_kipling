

var q = require('q');
var async = require('async');


function CREATE_DATA_GROUP_MANAGER(options) {
	this.options = options;

	// this.currentDelay = options.group_delay;
	this.currentDelay = 0;

	this.data = {};
	this.completeData = {};

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
			this.data[sn].push(registers[j].name);
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
