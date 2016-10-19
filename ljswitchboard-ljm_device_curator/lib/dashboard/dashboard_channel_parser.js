var dashboard_channels = require('./dashboard_channels.json');


var channels = {};
var keysToIgnore = ["comments"];
var deviceKeys = Object.keys(dashboard_channels).filter(function(key) {
	if(keysToIgnore.indexOf(key) >= 0) {
		return false;
	} else {
		channels[key] = {};

		
		
		// Initialize an object to organize channels into.
		var deviceChannels = {};

		var deviceData = dashboard_channels[key];
		var onBoardChannels = deviceData.onBoard;
		Object.keys(onBoardChannels).forEach(function(onBoardChKey) {
			deviceChannels[onBoardChKey] = onBoardChannels[onBoardChKey];
		});

		var externalPeripherals = deviceData.external;
		Object.keys(externalPeripherals).forEach(function(externalPortKey) { // Aka db15 or db37.
			var peripheralChannels = externalPeripherals[externalPortKey];
			Object.keys(peripheralChannels).forEach(function(peripheralChKey) {
				deviceChannels[peripheralChKey] = peripheralChannels[peripheralChKey];
			});
		});

		channels[key] = deviceChannels;
		return true;
	}
});

// console.log('Channels...', channels);

// deviceKeys.forEach(function(deviceKey) {

// });
// console.log('devices', deviceKeys);

exports.channels = channels;