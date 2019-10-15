

var async = require('async');

var keys = Object.keys(async);
var i = 0;
for (i = 0; i < keys.length; i++) {
	exports[keys[i]] = async[keys[i]];
}