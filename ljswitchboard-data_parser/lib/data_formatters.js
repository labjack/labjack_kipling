
var ljmmm_parse = require('ljmmm-parse');


var list = {
	// '3': {}, // U3
	// '6': {}, // U6
	// '9': {}, // UE9
	'7': {}, // T7
	'200': {}, // Digit
};

var errorList = {
	// '3': {}, // U3
	// '6': {}, // U6
	// '9': {}, // UE9
	'7': {}, // T7
	'200': {}, // Digit
};

var populateList = function(destination, newList, endKey) {
	var newListKeys = Object.keys(newList);
	newListKeys.forEach(function(key) {
		var i;
		var data = {'name': key};
		try {
			var items = Object.keys(newList[key]);
			for(i = 0; i < items.length; i++) {
				data[items[i]] = newList[key][items[i]];
			}
		} catch(err) {
			data.defaultValue = newList[key];
		}
		var entries = ljmmm_parse.expandLJMMMEntrySync(data);
		
		for(i = 0; i < entries.length; i++) {
			entries[i].address = undefined;
			delete entries[i].address;
			destination[endKey][entries[i].name] = entries[i];
		}
	});
};
// Populate List
var t7List = require('./t7_data_parser').T7_LIST;
populateList(list, t7List, '7');

var digitList = require('./digit_data_parser').DIGIT_LIST;
populateList(list, digitList, '200');

var sharedList = require('./shared_data_parser').SHARED_LIST;
var devKeys = Object.keys(list);
devKeys.forEach(function(devKey) {
	populateList(list, sharedList, devKey);
});
exports.list = list;

// Populate errorList
var t7ErrorsList = require('./t7_error_parser').T7_LIST;
populateList(errorList, t7ErrorsList, '7');

var digitErrorsList = require('./digit_error_parser').DIGIT_LIST;
populateList(errorList, digitErrorsList, '200');

var sharedErrorsList = require('./shared_error_parser').SHARED_LIST;
var devKeys = Object.keys(errorList);
devKeys.forEach(function(devKey) {
	populateList(errorList, sharedErrorsList, devKey);
});
exports.errorList = errorList;