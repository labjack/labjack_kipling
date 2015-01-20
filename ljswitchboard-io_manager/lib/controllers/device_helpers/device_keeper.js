

var q = require('q');
var dict = require('dict');

var ljm_device_helper = require('./ljm_device_helper');

function createDeviceKeeper() {

	var devices = dict();

	/**
     * Add a new device to this keeper.
     *
     * @param {Device} device The device to add to this keeper.
    **/
	this.addDevice = function(device) {
		var defered = q.defer();
		ljm_device_helper.getDeviceKey(device)
		.then(function(key) {
			devices.set(key, device);
			defered.resolve();
		});
	};

	/**
     * Deermine how many devices this keeper has in it.
     *
     * @return {Number} The number of devices this keeper currently has in it.
    **/
	this.getNumDevices = function() {
		return devices.size;
	};

	/**
     * Remove a device from this keeper.
     *
     * @param {Device} device The device or equivalent device to remove from
     *      this keeper.
    **/
	this.removeDevice = function(device) {
		var defered = q.defer();
		ljm_device_helper.getDeviceKey(device)
		.then(function(key) {
			if(devices.has(key)) {
				devices.delete(key);
			}
			defered.resolve();
		});
	};

	/**
	 * get a device from this keeper based on a 
	 */


	var self = this;
}

exports.createDeviceKeeper = createDeviceKeeper;
