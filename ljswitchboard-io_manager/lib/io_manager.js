
console.log('Included io_manager');
var io_interface = require('./io_interface');
// var io_delegator = require('./io_delegator');

console.log('Included io_manager B');
exports.io_interface = io_interface.createIOInterface;
// exports.io_delegator = io_delegator;

exports.include_type = 'library';

testFunc = function() {
	console.log('here');
};
// module.exports.testFunc = function() {
// 	console.log('HERE');
// };
module.exports.testFunc = testFunc;