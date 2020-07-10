
var shared_error_parser = require('./shared_error_parser');

var ipDefaultVal = 0;
var currentSourceCalDefault = -0.00009999;

var T5_LIST = {
	// 'AIN#(0:254)': defaultFloat,
	'AIN#(0:254)_RANGE': 10,
	'AIN#(0:254)_NEGATIVE_CH': 199,
	'AIN#(0:254)_RESOLUTION_INDEX': 0,
	'AIN#(0:254)_SETTLING_US': 0,
	
	// 'TEMPERATURE_DEVICE_K':defaultFloat,
	// 'WIFI_STATUS': 2909,
	// 'WIFI_RSSI': -201,
	'WIFI_IP': ipDefaultVal,
	'WIFI_SUBNET': ipDefaultVal,
	'WIFI_GATEWAY': ipDefaultVal,
	'WIFI_IP_DEFAULT': ipDefaultVal,
	'WIFI_SUBNET_DEFAULT': ipDefaultVal,
	'WIFI_GATEWAY_DEFAULT': ipDefaultVal,
	'ETHERNET_IP': ipDefaultVal,
	'ETHERNET_SUBNET': ipDefaultVal,
	'ETHERNET_GATEWAY': ipDefaultVal,
	'ETHERNET_DNS': ipDefaultVal,
	'ETHERNET_ALTDNS': ipDefaultVal,
	'ETHERNET_IP_DEFAULT': ipDefaultVal,
	'ETHERNET_SUBNET_DEFAULT': ipDefaultVal,
	'ETHERNET_GATEWAY_DEFAULT': ipDefaultVal,
	'ETHERNET_DNS_DEFAULT': ipDefaultVal,
	'ETHERNET_ALTDNS_DEFAULT': ipDefaultVal,

	'CURRENT_SOURCE_200UA_CAL_VALUE': currentSourceCalDefault,
	'CURRENT_SOURCE_10UA_CAL_VALUE': currentSourceCalDefault,
};

exports.T5_LIST = T5_LIST;