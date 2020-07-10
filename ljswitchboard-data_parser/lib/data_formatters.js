
var ljmmm_parse = require('@labjack/ljmmm-parse');


var list = {
	// '3': {}, // U3
	// '6': {}, // U6
	// '9': {}, // UE9
	'4': {}, // T4
	'5': {}, // T5
	'7': {}, // T7
	'8': {}, // T7
	'200': {}, // Digit
};

var errorList = {
	// '3': {}, // U3
	// '6': {}, // U6
	// '9': {}, // UE9
	'4': {}, // T4
	'5': {}, // T5
	'7': {}, // T7
	'8': {}, // T7
	'200': {}, // Digit
};

var populateList = function(destination, newList, endKey, debug) {
	var newListKeys = Object.keys(newList);
	newListKeys.forEach(function(key) {
		var i;
		var data = {'name': key};

		var items = Object.keys(newList[key]);
		for(i = 0; i < items.length; i++) {
			data[items[i]] = newList[key][items[i]];
		}

		if(debug) {
			console.log('Adding...', data, key);
		}
		var entries = ljmmm_parse.expandLJMMMEntrySync(data);
		
		for(i = 0; i < entries.length; i++) {
			entries[i].address = undefined;
			delete entries[i].address;
			destination[endKey][entries[i].name] = entries[i];
		}
	});
};

function populateErrorList(destination, newList, endKey, debug) {
	var newListKeys = Object.keys(newList);
	newListKeys.forEach(function(key) {
		var i;
		var data = {'name': key};
		data.defaultValue = newList[key];

		if(debug) {
			console.log('Adding...', data, key);
		}
		var entries = ljmmm_parse.expandLJMMMEntrySync(data);
		
		for(i = 0; i < entries.length; i++) {
			entries[i].address = undefined;
			delete entries[i].address;
			destination[endKey][entries[i].name] = entries[i];
		}
	});
}
// Populate List
var t8List = require('./t8_data_parser').T8_LIST;
populateList(list, t8List, '8');

var t7List = require('./t7_data_parser').T7_LIST;
populateList(list, t7List, '7');

var t4List = require('./t4_data_parser').T4_LIST;
populateList(list, t4List, '4');

var t5List = require('./t5_data_parser').T5_LIST;
populateList(list, t5List, '5');

var digitList = require('./digit_data_parser').DIGIT_LIST;
populateList(list, digitList, '200');

var sharedList = require('./shared_data_parser').SHARED_LIST;
var devKeys = Object.keys(list);
devKeys.forEach(function(devKey) {
	populateList(list, sharedList, devKey);
});
exports.list = list;

// Populate errorList
var t8ErrorsList = require('./t8_error_parser').T8_LIST;
populateErrorList(errorList, t8ErrorsList, '8', false);

var t7ErrorsList = require('./t7_error_parser').T7_LIST;
populateErrorList(errorList, t7ErrorsList, '7', false);

var t4ErrorsList = require('./t4_error_parser').T4_LIST;
populateErrorList(errorList, t4ErrorsList, '4', false);

var t5ErrorsList = require('./t5_error_parser').T5_LIST;
populateErrorList(errorList, t5ErrorsList, '5', false);

var digitErrorsList = require('./digit_error_parser').DIGIT_LIST;
populateErrorList(errorList, digitErrorsList, '200');

var sharedErrorsList = require('./shared_error_parser').SHARED_LIST;
var devKeys = Object.keys(errorList);
devKeys.forEach(function(devKey) {
	populateErrorList(errorList, sharedErrorsList, devKey);
});
exports.errorList = errorList;