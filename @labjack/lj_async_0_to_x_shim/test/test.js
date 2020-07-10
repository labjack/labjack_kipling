
var async = require('../lj_async_shim');

exports.testEachSeries = function(test) {
	var list = [1,2];
	var outList = [];
	var numCounts = 0;
	async.eachSeries(list, function(i, cb) {
		outList.push(i);
		cb();
	}, function(err) {
		test.deepEqual(outList, list, "lists do not match");
		test.done();
	});
}

exports.testEachSeriesWithError = function(test) {
	var list = [1,2];
	var outList = [];
	var numCounts = 0;
	var errObj = {
		'err': true,
		'msg': 'aa'
	};
	async.eachSeries(list, function(i, cb) {
		outList.push(i);
		cb(errObj);
	}, function(err) {
		test.deepEqual(err, errObj);
		test.deepEqual(outList, [list[0]], "list is not just one");
		test.done();
	});
}