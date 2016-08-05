

var REQUIRED_INFO_BY_DEVICE = {
	'LJM_dtDIGIT': [
		'DEVICE_NAME_DEFAULT',
		'DGT_INSTALLED_OPTIONS'
	],
	'LJM_dtT7': [
		'DEVICE_NAME_DEFAULT',
        'HARDWARE_INSTALLED',
        'ETHERNET_IP',
        'WIFI_STATUS',
        'WIFI_IP',
        'WIFI_RSSI',
        'FIRMWARE_VERSION'
	],
	'LJM_dtT4': [
		'DEVICE_NAME_DEFAULT',
        'HARDWARE_INSTALLED',
        'ETHERNET_IP',
        'FIRMWARE_VERSION'
	]
};
module.exports.requiredInfo = REQUIRED_INFO_BY_DEVICE;