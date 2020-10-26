var q = global.require('q');
const package_loader = global.lj_di_injector.get('package_loader');
const static_files = package_loader.getPackage('static_files');

exports.appendPageLogicToScanResults = function(scanResults, wifiImageTemplate) {
	// console.log('Appending page logic');
	var defered = q.defer();
	try {
		var i, j, k;
		for(i = 0; i < scanResults.length; i++) {
			var deviceType = scanResults[i];
			for(j = 0; j < deviceType.devices.length; j++) {
				var device = deviceType.devices[j];
				if(device.isActive) {
					device.connect_buttons_class = 'hidden-button';
					device.disconnect_buttons_class = '';
				} else {
					device.connect_buttons_class = '';
					device.disconnect_buttons_class = 'hidden-button';
				}
				var length = 0;
				if(device) {
					if(device.connectionTypes) {
						length = device.connectionTypes.length;
					}
				}
				for(k = 0; k < length; k++) {
					var ct = device.connectionTypes[k];
					// console.log(device.serialNumber, ct.name, ct.verified);
					ct.button_class = '';
					ct.button_title = 'Connect to ';
					ct.button_title += device.productType;
					ct.button_title += ' using ' + ct.name;
					ct.button_state = '';
					if(!ct.verified) {
						// Not disabling the button anymore... 2/5/2016 (CJ)
						// ct.button_state = 'disabled';

						ct.button_title = ct.name + ' connection type was found';
						ct.button_title += ' but failed verification.';

					} else {
						if(ct.insertionMethod === 'attribute') {
							ct.button_class = 'btn-warning';
							ct.button_title = 'Found & verified via read attributes. ' + ct.button_title;
						} else {
							ct.button_class = 'btn-success';
						}
					}
				}

				try {
					if(device.WIFI_STATUS) {
						var imageName = 'wifiRSSI-unknown';
						var rssiImage = device.WIFI_RSSI.imageName;
						var rssiStr = device.WIFI_RSSI.str;
						var wifiStatus = device.WIFI_STATUS.str;
						var imageTitle = 'WiFi Status: ' + wifiStatus;
						var imageData = '';
						var imageDataContext = {};
						if(wifiStatus === 'Un-Powered') {
							imageTitle = 'WiFi Module Un-Powered';
							imageName = rssiImage;
						} else if(wifiStatus === 'Associated') {
							imageTitle = 'Signal Strength is ' + rssiStr;
							imageName = rssiImage;
						}
						if(wifiImageTemplate) {
							// console.log('connection_button_logic.js Trying to get the directory of static_files', static_files.getDir());
							imageDataContext = {
								'imageTitle': imageTitle,
								'imageName': imageName,
								'staticFiles': static_files.getDir()
							};
							imageData = wifiImageTemplate(imageDataContext);
						}
						device.wifiImage = imageData;
						device.wifiImageData = imageDataContext;
					}
				} catch(err) {
					// failed to get wifi image;
					console.log('ERROR getting wifi image', err);
				}
				// build wifi image str:
				// 'name': 'wifiStatusStr',
				//  'vals': {
				//      'Un-Powered': '<img title="WiFi Module Unpowered" class="wifiRSSIImage" src="static/img/wifiRSSI-not-active.png">',
				//      'Associated': '<img title="Signal Strength is {{ device.wifiRSSIStr }}" class="wifiRSSIImage" src="static/img/{{ device.wifiRSSIImgName }}.png">'
				//  },
				//  'defaultVal': '<img title="WiFi Module {{ device.wifiStatusStr }}" class="wifiRSSIImage" src="static/img/wifiRSSI-unknown.png">'
			}
		}
	} catch(err) {
		console.error('Error', err);
	}
	defered.resolve(scanResults);
	return defered.promise;
};
