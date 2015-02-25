
var ljmmm_parse = require('ljmmm-parse');


var list = {
	// '3': {}, // U3
	// '6': {}, // U6
	// '9': {}, // UE9
	'7': {}, // T7
	'200': {}, // Digit

};

var populateList = function(newList, endKey) {
	var newListKeys = Object.keys(newList);
	newListKeys.forEach(function(key) {
		var i;
		var data = {'name': key};
		var items = Object.keys(newList[key]);
		for(i = 0; i < items.length; i++) {
			data[items[i]] = newList[key][items[i]];
		}
		var entries = ljmmm_parse.expandLJMMMEntrySync(data);
		
		for(i = 0; i < entries.length; i++) {
			entries[i].address = undefined;
			delete entries[i].address;
			list[endKey][entries[i].name] = entries[i];
		}
	});
};
var t7List = require('./t7_data_parser').T7_LIST;
populateList(t7List, '7');

var digitList = require('./digit_data_parser').DIGIT_LIST;
populateList(digitList, '200');

var sharedList = require('./shared_data_parser').SHARED_LIST;
var devKeys = Object.keys(list);
devKeys.forEach(function(devKey) {
	populateList(sharedList, devKey);
});

exports.list = list;