


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
};

exports.DIGIT_LIST = DIGIT_LIST;