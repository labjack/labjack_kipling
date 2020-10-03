var assert = require('chai').assert;
var async = require('../lj_async_shim');

describe('basic_test', function() {
	it('testEachSeries', function (done) {
		var list = [1,2];
		var outList = [];
		var numCounts = 0;
		async.eachSeries(list, function(i, cb) {
			outList.push(i);
			cb();
		}, function(err) {
			assert.deepEqual(outList, list, "lists do not match");
			done();
		});
	});

	it('testEachSeriesWithError', function (done) {
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
			assert.deepEqual(err, errObj);
			assert.deepEqual(outList, [list[0]], "list is not just one");
			done();
		});
	});
});
