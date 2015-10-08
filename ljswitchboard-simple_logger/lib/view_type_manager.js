

var VIEW_TYPE_CONSTANTS = {
	'basic_graph': {
		'window_size': {
			'default_value': 20,
			'min': 10,
			'max': 1000,
		}
	},
	'current_values': {
		'window_size': {
			'default_value': 1,
			'min': 1,
			'max': 1,
		}
	},
}
function isValidViewType(view_data) {
	
}

function getWindowSize(view_data) {
	var view_type = view_data.view_type;
	var view_constants = VIEW_TYPE_CONSTANTS[view_type];
	var ws_constants = view_constants.window_size;
	var retSize = view_constants.window_size.default_value;

	var desiredSize;
	var saveDesiredSize = false;
	if(view_data.window_size) {
		if(!isNaN(view_data.window_size)) {
			desiredSize = parseInt(view_data.window_size);

			// If the number can be parsed to an integer, it can be used.
			saveDesiredSize = true;

			// Force the window size to be within the bounds.
			if (desiredSize < ws_constants.min) {
				desiredSize = ws_constants.min;
			} else if(desiredSize > ws.ws_constants.max) {
				desiredSize = ws_constants.max;
			}
		}
	}

	if(saveDesiredSize) {
		retSize = desiredSize;
	}
	return retSize;
}


exports.data = VIEW_TYPE_CONSTANTS;
exports.isValidViewType = isValidViewType;
exports.getWindowSize = getWindowSize;