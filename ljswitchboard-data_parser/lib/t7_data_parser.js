

var checkStr = function(str) {
	if(str) {
		return str;
	} else {
		return '';
	}
};

var parseIP = function(ipNum) {
	var isReal = false;
	if(ipNum !== 0) {
		isReal = true;
	}
	var ipStr = "";
	var ipAddr = new Buffer(4);
	ipAddr.writeUInt32LE(ipNum, 0);
	ipStr += ipAddr.readUInt8(3).toString();
	ipStr += ".";
	ipStr += ipAddr.readUInt8(2).toString();
	ipStr += ".";
	ipStr += ipAddr.readUInt8(1).toString();
	ipStr += ".";
	ipStr += ipAddr.readUInt8(0).toString();
	return {'str': ipStr, 'isReal':isReal};
};
var encodeIP = function(ipStr) {
	var ipBuf = new Buffer(4);
	var i;
	ipBuf.fill(0);
	if(ipStr.split) {
		var ipVals = ipStr.split('.');
		if(ipVals.length == 4) {
			for(i = 0; i < 4; i ++) {
				if(!isNaN(ipVals[i])) {
					ipBuf.writeUInt8(parseInt(ipVals[i], 10), i);
				}
			}
		}
	}
	return ipBuf.readUInt32BE(0);
};
var ipDataType = {
	'decode': parseIP,
	'encode': encodeIP
};

var firmwareVersionRounder = function(res) {
	return {
		'val': parseFloat(res.toFixed(4)),
		'str': res.toFixed(4)
	};
};

var T7_LIST = {
	'AIN#(0:254)': {
		'decode': function(val) {
			var res = {
				'val': val,
				'rounded': 0,
				'unit': 'V',
				'str': ''
			};
			var strVal = '';
			
			// Decide whether or not to convert units for sigfig reasons.
			if((-0.1 < val) && (val < 0.1)) {
				var rVal = val * 1000;
				res.unit = 'mV';
				res.val = rVal;
				res.str = rVal.toFixed(6);
				res.rounded = parseFloat(res.str);
			} else {
				res.str = val.toFixed(6);
				res.rounded = parseFloat(res.str);
			}
			return res;
		}
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
			var str = checkStr(T7_LIST.WIFI_STATUS.valToString[res]);
			return {'str': str};
		},
	},
	'WIFI_RSSI': {
		'images': [
			{'val':-45,'img':'wifiRSSI-4'},
			{'val':-60,'img':'wifiRSSI-3'},
			{'val':-65,'img':'wifiRSSI-2'},
			{'val':-75,'img':'wifiRSSI-1'},
			{'val':-80,'img':'wifiRSSI-0'},
			{'val':-200,'img':'wifiRSSI-0'},
		],
		'decode': function(res) {
			var unit = 'dB';
			var imgName = '';
			var str = res.toString() + ' dB';
			var WIFI_RSSI_IMAGES = T7_LIST.WIFI_RSSI.images;

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
	'FIRMWARE_VERSION': {
		'decode': firmwareVersionRounder
	},
	'BOOTLOADER_VERSION': {
		'decode': firmwareVersionRounder,
	},
	'WIFI_VERSION': {
		'decode': firmwareVersionRounder,
	},
	'HARDWARE_INSTALLED': {
		'decode': function(res) {
				// Deconstruct the HARDWARE_INSTALLED bitmask
				var highResADC = ((res & 0xFF) >> 0) & 0x1;
				var wifi = ((res & 0xFF) >> 1) & 0x1;
				var rtc = ((res & 0xFF) >> 2) & 0x1;
				var sdCard = ((res & 0xFF) >> 3) & 0x1;

				highResADC = highResADC == 1;
				wifi = wifi == 1;
				rtc = rtc == 1;
				sdCard = sdCard == 1;
				
				var subclass = '';
				var isPro = false;
				var productType = 'T7';
				if(highResADC || wifi || rtc) {
					subclass = '-Pro';
					isPro = true;
					productType += subclass;
				}
				return {
					'highResADC': highResADC,
					'wifi': wifi,
					'rtc': rtc,
					'sdCard': sdCard,
					'res': res,
					'subclass': subclass,
					'isPro': isPro,
					'productType': productType
				};
			},
	},
	'WIFI_IP': ipDataType,
	'WIFI_SUBNET': ipDataType,
	'WIFI_GATEWAY': ipDataType,
	'WIFI_IP_DEFAULT': ipDataType,
	'WIFI_SUBNET_DEFAULT': ipDataType,
	'WIFI_GATEWAY_DEFAULT': ipDataType,
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
};

exports.T7_LIST = T7_LIST;