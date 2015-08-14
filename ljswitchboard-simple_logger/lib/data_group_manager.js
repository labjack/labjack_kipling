

var q = require('q');
var async = require('async');


function CREATE_DATA_GROUP_MANAGER(options) {
	this.options = options;

	this.currentDelay = options.group_delay;

	this.data = {};

	var serialNumbers = options.device_serial_numbers;
	for(var i = 0; i < serialNumbers.length; i++) {
		var sn = serialNumbers[i]
		this.data[sn] = [];

		var registers = options[sn].registers;
		for(var j = 0; j < registers.length; j++) {
			// this.data[sn].push({
			// 	'name': registers[j].name,
			// 	'format': registers[j].format,
			// 	'format_func': registers[j].format_func,
			// });
			this.data[sn].push(registers[j].name);
		}
	}

	this.getRequiredRegisters = function() {
		var retData = undefined;
		// decrement the current delay counter
		self.currentDelay -= 1;

		if(self.currentDelay < 0) {
			retData = JSON.parse(JSON.stringify(self.data));
			self.currentDelay = options.group_delay;
		}

		return retData;
	};
	var self = this;
}


exports.create = function(options) {
	return new CREATE_DATA_GROUP_MANAGER(options);
};
