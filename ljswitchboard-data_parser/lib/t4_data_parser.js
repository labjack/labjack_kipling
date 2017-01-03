
var shared_data_parser = require('./shared_data_parser');
var checkStr = shared_data_parser.checkStr;

var ipDataType = shared_data_parser.ipDataType;
var systemEnabledType = shared_data_parser.systemEnabledType;
var getSystemEnabledType = shared_data_parser.getSystemEnabledType;

var firmwareVersionRounder = shared_data_parser.firmwareVersionRounder;
var decodeCurrentSourceCalVal = function(val) {
	var res = {
		'val': 0,
		'str': '',
		'unit': 'uA',
	};
	var rVal = (val * 1000000).toFixed(3);
	res.val = parseFloat(rVal);
	res.str = rVal;
	return res;
};

function decodeSixDigitsOfPrecisionFloat(val) {
	var strVal = val.toFixed(6);
	var res = {
		'val': parseFloat(strVal),
		'str': strVal,
	};
	return res;
}
var analogFloatReg = {
	'decode': decodeSixDigitsOfPrecisionFloat,
};

function decodeByteSizeRegisters(val) {
	var kB = parseFloat((val/1000).toFixed(3));
	var mB = parseFloat((kB/1000).toFixed(3));
	var str = val.toString() + ' B';
	if(mB >= 1) {
		str = mB.toString() + ' MB';
	} else if(kB >= 1) {
		str = kB.toString() + ' KB';
	}
	var res = {
		'res': val,
		'val': val,
		'unit': 'B',
		'bytes': val,
		'kBytes': kB,
		'mBytes': mB,
		'str': str,
	};
	return res;
}

var T4_LIST = {
	'AIN#(0:254)': {
		'decode': function(val) {
			var res = {
				'val': parseFloat(val.toFixed(4)),
				'rounded': 0,
				'unit': 'V',
				'str': ''
			};
			var strVal = '';
			
			var convertSigFigs = false;
			// Decide whether or not to convert units for sigfig reasons.
			if((-0.1 < val) && (val < 0.1) && convertSigFigs) {
				var rVal = val * 1000;
				res.unit = 'mV';
				res.str = rVal.toFixed(4);
				res.rounded = parseFloat(res.str);
			} else {
				res.str = val.toFixed(4);
				res.rounded = parseFloat(res.str);
			}
			if(val == -9999) {
				res.str = '-9999';
			}
			return res;
		}
	},
	'AIN#(0:254)_RANGE': analogFloatReg,
	'AIN#(0:254)_SETTLING_US': analogFloatReg,

	'AIN_ALL_RANGE': analogFloatReg,
	'AIN_ALL_SETTLING_US': analogFloatReg,

	'AIN#(0:149)_EF_READ_A': analogFloatReg,
	'AIN#(0:149)_EF_READ_B': analogFloatReg,
	'AIN#(0:149)_EF_READ_C': analogFloatReg,
	'AIN#(0:149)_EF_READ_D': analogFloatReg,

	'AIN#(0:149)_EF_CONFIG_D': analogFloatReg,
	'AIN#(0:149)_EF_CONFIG_E': analogFloatReg,
	'AIN#(0:149)_EF_CONFIG_F': analogFloatReg,
	'AIN#(0:149)_EF_CONFIG_G': analogFloatReg,

	'DAC#(0:1)': {
		'decode': function(val) {
			var res = {
				'val': 0,
				'unit': 'V',
				'str': ''
			};
			res.str = val.toFixed(3);
			res.val = parseFloat(res.str);
			return res;
		}
	},
	'TEMPERATURE_DEVICE_K':{
		'decode': function(val) {
			return {
				'val': parseFloat(val.toFixed(4)),
				'str': val.toFixed(4),
				'unit': 'K',
			};
		},
	},
	'TEMPERATURE_AIR_K':{
		'decode': function(val) {
			return {
				'val': parseFloat(val.toFixed(4)),
				'str': val.toFixed(4),
				'unit': 'K',
			};
		},
	},
	'CURRENT_SOURCE_200UA_CAL_VALUE': {
		'decode': decodeCurrentSourceCalVal,
	},
	'CURRENT_SOURCE_10UA_CAL_VALUE': {
		'decode': decodeCurrentSourceCalVal,
	},
	'WIFI_STATUS': {
		'valToString': {
			2900: 'Associated',
			2901: 'Associating',
			2902: 'Association Failed',
			2903: 'Un-Powered',
			2904: 'Booting Up',
			2905: 'Could Not Start',
			2906: 'Applying Settings',
			2907: 'DHCP Started',
			2908: 'Unknown',
			2909: 'Other'
		},
		'decode': function(res) {
			var str = checkStr(T4_LIST.WIFI_STATUS.valToString[res]);
			var isConnected = false;
			if(res === 2900) {
				isConnected = true;
			}
			return {'str': str, 'isConnected': isConnected, 'val': str};
		},
	},
	'WIFI_RSSI': {
		'images': [
			{'val':  0,'img':'wifiRSSI-0'},
			{'val':-45,'img':'wifiRSSI-4'},
			{'val':-60,'img':'wifiRSSI-3'},
			{'val':-65,'img':'wifiRSSI-2'},
			{'val':-75,'img':'wifiRSSI-1'},
			{'val':-80,'img':'wifiRSSI-0'},
			{'val':-200,'img':'wifiRSSI-0'},
			{'val':-201,'img':'wifiRSSI-not-active'},
		],
		'decode': function(res) {
			var unit = 'dB';
			var imgName = '';
			var str = res.toString() + 'dB';
			var WIFI_RSSI_IMAGES = T4_LIST.WIFI_RSSI.images;

			if(res < WIFI_RSSI_IMAGES[0].val) {
				WIFI_RSSI_IMAGES.some(function(rssiData){
					if(res < rssiData.val) {
					} else {
						imgName = rssiData.img;
						return true;
					}
				});
			} else {
				imgName = WIFI_RSSI_IMAGES[0].img;
			}

			if(imgName === '') {
				imgName = WIFI_RSSI_IMAGES[WIFI_RSSI_IMAGES.length-1].img;
			}
			return {
				'unit': unit,
				'imageName': imgName,
				'str': str
			};
		}
	},
	'WIFI_VERSION': {
		'decode': firmwareVersionRounder,
	},
	'HARDWARE_INSTALLED': {
		'decode': function(res) {
				//T7 Stuff...
				// // Deconstruct the HARDWARE_INSTALLED bitmask
				// var highResADC = ((res & 0xFF) >> 0) & 0x1;
				// var wifi = ((res & 0xFF) >> 1) & 0x1;
				// var rtc = ((res & 0xFF) >> 2) & 0x1;
				// var sdCard = ((res & 0xFF) >> 3) & 0x1;

				// highResADC = highResADC == 1;
				// wifi = wifi == 1;
				// rtc = rtc == 1;
				// sdCard = sdCard == 1;
				
				// var subclass = '';
				// var isPro = false;
				// var productType = 'T7';
				// if(highResADC || wifi || rtc) {
				// 	subclass = '-Pro';
				// 	isPro = true;
				// 	productType += subclass;
				// }

				// // Wifi bit-fix, (if isPro, then wifi is installed)
				// // if(isPro) {
				// // 	wifi = true;
				// // }
				// return {
				// 	'highResADC': highResADC,
				// 	'wifi': wifi,
				// 	'rtc': rtc,
				// 	'sdCard': sdCard,
				// 	'res': res,
				// 	'subclass': subclass,
				// 	'isPro': isPro,
				// 	'productType': productType
				// };
				// T4 stuff...
				return {
					'res': res,
					'subclass': '',
					'productType': 'T4',
				};
			},
	},

	// File I/O Registers
	'FILE_IO_ATTRIBUTES': {
		'decode': function(res) {
			// Nothing with bit 0 (shift 0)
			// Nothing with bit 1 (shift 1)
			// Nothing with bit 2 (shift 2)
			// Nothing with bit 3 (shift 3)
			// Interpret bit 4:
			var isDir = ((res & 0xFF) >> 4) & 0x1;
			// Interpret bit 5:
			var isFile = ((res & 0xFF) >> 5) & 0x1;

			isDir = isDir == 1;
			isFile = isFile == 1;
			return {
				'res': res,
				'val': res,
				'isDirectory': isDir,
				'isFile': isFile,
			};
		},
	},
	'FILE_IO_SIZE_BYTES': {
		'decode': decodeByteSizeRegisters,
	},
	'FILE_IO_SIZE': {
		'decode': decodeByteSizeRegisters,
	},
	'FILE_IO_DISK_SECTOR_SIZE': {
		'decode': decodeByteSizeRegisters,
	},
	'FILE_IO_DISK_SECTOR_SIZE_BYTES': {
		'decode': decodeByteSizeRegisters,
	},
	'FILE_IO_DISK_FORMAT_INDEX': {
		'decode': function(res) {
			var fsType = 'Unknown: ' + res.toString();
			if(res === 1) {
				fsType = 'FAT12';
			} else if(res === 2) {
				fsType = 'FAT16';
			} else if(res === 3) {
				fsType = 'FAT32';
			}
			return {
				'res': res,
				'val': res,
				'str': fsType,
				'fileSystem': fsType,
			};
		},
	},

	// WiFi IP registers using the ipDataType
	// & DHCP as custom systemEnabledType
	'WIFI_IP': ipDataType,
	'WIFI_SUBNET': ipDataType,
	'WIFI_GATEWAY': ipDataType,
	'WIFI_IP_DEFAULT': ipDataType,
	'WIFI_SUBNET_DEFAULT': ipDataType,
	'WIFI_GATEWAY_DEFAULT': ipDataType,
	'WIFI_DHCP_ENABLE': getSystemEnabledType({
		textPrepend: 'DHCP',
	}),
	'WIFI_DHCP_ENABLE_DEFAULT': getSystemEnabledType({
		textPrepend: 'DHCP',
	}),

	// Ethernet IP registers using the ipDataType
	// & DHCP as custom systemEnabledType
	'ETHERNET_IP': ipDataType,
	'ETHERNET_SUBNET': ipDataType,
	'ETHERNET_GATEWAY': ipDataType,
	'ETHERNET_DNS': ipDataType,
	'ETHERNET_ALTDNS': ipDataType,
	'ETHERNET_IP_DEFAULT': ipDataType,
	'ETHERNET_SUBNET_DEFAULT': ipDataType,
	'ETHERNET_GATEWAY_DEFAULT': ipDataType,
	'ETHERNET_DNS_DEFAULT': ipDataType,
	'ETHERNET_ALTDNS_DEFAULT': ipDataType,
	'ETHERNET_DHCP_ENABLE': getSystemEnabledType({
		textPrepend: 'DHCP',
	}),
	'ETHERNET_DHCP_ENABLE_DEFAULT': getSystemEnabledType({
		textPrepend: 'DHCP',
	}),

	// Stream Registers
	'STREAM_ENABLE': getSystemEnabledType({
		textPrepend: 'Stream',
		statusText: 'Running/Stopped',
	}),

	// Power registers enabled/disabled
	'POWER_ETHERNET': getSystemEnabledType({
		textPrepend: 'Ethernet',
		statusText: 'Powered/Not Powered',
	}),
	'POWER_WIFI': getSystemEnabledType({
		textPrepend: 'WiFi',
		statusText: 'Powered/Not Powered',
	}),
	'POWER_AIN': getSystemEnabledType({
		textPrepend: 'Analog Input Module',
		statusText: 'Powered/Not Powered',
	}),
	'POWER_LED': getSystemEnabledType({
		textPrepend: 'Device LED',
		statusText: 'Powered/Not Powered',
	}),
	'POWER_ETHERNET_DEFAULT': getSystemEnabledType({
		textPrepend: 'Ethernet',
		statusText: 'Powered/Not Powered',
	}),
	'POWER_WIFI_DEFAULT': getSystemEnabledType({
		textPrepend: 'WiFi',
		statusText: 'Powered/Not Powered',
	}),
	'POWER_AIN_DEFAULT': getSystemEnabledType({
		textPrepend: 'Analog Input Module',
		statusText: 'Powered/Not Powered',
	}),
	'POWER_LED_DEFAULT': getSystemEnabledType({
		textPrepend: 'Device LED',
		statusText: 'Powered/Not Powered',
	}),

	// Watchdog Registers
	'WATCHDOG_ENABLE_DEFAULT': getSystemEnabledType({
		textPrepend: 'Watchdog',
	}),

	'ASYNCH_ENABLE': systemEnabledType,
};

exports.T4_LIST = T4_LIST;