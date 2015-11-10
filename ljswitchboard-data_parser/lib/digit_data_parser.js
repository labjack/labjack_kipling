

var DGT_LOG_INTERVAL_INDEX_CONSTANTS = {
	'0': 10,
	'1': 30,
	'2': 60,
	'3': 600,
	'4': 1800,
	'5': 3600,
	'6': 21600,
};

var DIGIT_LIST = {
	'DGT_INSTALLED_OPTIONS': {
		'decode': function(res) {
				var temperature = false;
				var light = false;
				var humidity = false;
				var subclass = '';
				var productType = 'Digit';
				if(res == 2) {
					temperature = true;
					light = true;
					subclass = '-TL';
				} else if(res == 3) {
					temperature = true;
					light = true;
					humidity = true;
					subclass = '-TLH';
				}
				productType += subclass;
				
				return {
					'temperature': temperature,
					'light': light,
					'humidity': humidity,
					'res': res,
					'subclass': subclass,
					'productType': productType
				};
			},
	},
	'DGT_LOG_ITEMS_DATASET': {
		'decode': function(res) {
			var temperature = false;
			var light = false;
			var humidity = false;
			var isValid = true;

			if(res == 1) {
				temperature = true;
			} else if(res == 3) {
				temperature = true;
				light = true;
			} else if(res == 5) {
				temperature = true;
				humidity = true;
			} else if(res == 7) {
				temperature = true;
				light = true;
				humidity = true;
			} else {
				isValid = false;
			}

			return {
				'temperature': temperature,
				'light': light,
				'humidity': humidity,
				'isValid': isValid,
				'res': res,
			};
		},
	},
	// Don't have to interpret...
	'DGT_STORED_BYTES': {
		'decode': function(res) {
			var numBytes = Math.round(res/2);
			return {
				'numBytes': numBytes,
				'res': numBytes,
			};
		},
	},
	'DGT_LOG_INTERVAL_INDEX_DATASET': {
		'decode': function(res) {
			var key = res.toString();
			if(DGT_LOG_INTERVAL_INDEX_CONSTANTS[key]) {
				return {
					'time': DGT_LOG_INTERVAL_INDEX_CONSTANTS[key],
					'isValid': true,
					'res': res,
				};
			} else {
				return {
					'time': DGT_LOG_INTERVAL_INDEX_CONSTANTS['0'],
					'isValid': false,
					'res': res,
				};
			}
		},
	},
};


exports.DIGIT_LIST = DIGIT_LIST;