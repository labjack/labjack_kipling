
var ljn = require('../lib/labjack_nodejs');
var dr = ljn.driver();
var results = dr.openAllSync(7,5);
console.log('results', results);
