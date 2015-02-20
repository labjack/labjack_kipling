
var ljmmm_parse = require('ljmmm-parse');


var list = {
	'7': {}
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
exports.list = list;