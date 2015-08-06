
var path = require('path');


var device_data_collector;
var config_loader = require('../../lib/device_data_collector');

var cwd = process.cwd();

var mock_device_manager = require('../mock_device_manager');
var mockDeviceManager = mock_device_manager.createDeviceManager();

var driver_const = require('ljswitchboard-ljm_driver_constants');
/* Configure what devices to open/create */
mockDeviceManager.configure([{
	'deviceType': driver_const.LJM_DT_T7,
	'serialNumber': 1,
	'connectionType': driver_const.LJM_CT_USB,
}, {
	'deviceType': driver_const.LJM_DT_T7,
	'serialNumber': 2,
	'connectionType': driver_const.LJM_CT_USB,
}]);

exports.tests = {
	'Require device_data_collector': function(test) {
		try {
			device_data_collector = require('../../lib/device_data_collector');
			test.ok(true);
		} catch(err) {
			test.ok(false, 'error loading device_data_collector');
		}
		test.done();
	},
	'Open Devices': mockDeviceManager.openDevices,
	'Close Devices':mockDeviceManager.closeDevices,
};