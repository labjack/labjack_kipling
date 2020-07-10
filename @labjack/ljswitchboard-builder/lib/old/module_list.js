
var modules = {
	'Device_Connector': {
		'name': 'Device Connector',
		'dependents': [],

	},
	'AIN_MODULE': {
		'name': 'Analog Inputs',
		'dependents': [{
			'device_manager': function() {
				return require('device_manager');
			},
		}]
	}
};
