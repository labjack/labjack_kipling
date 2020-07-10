


var q = require('q');

function createFileIOController(io_interface) {
	this.io_interface = io_interface;
	this.init = function() {
		var defered = q.defer();

		defered.resolve();
		return defered.promise;
	};
	var self = this;
}

exports.createNewFileIOController = createFileIOController;
