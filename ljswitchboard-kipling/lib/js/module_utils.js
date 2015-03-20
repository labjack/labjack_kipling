
var p = function(promiseFunc) {
	if(promiseFunc) {
		if(promiseFunc.then) {
			promiseFunc.then(function(res) {
				console.log('Result', res);
			}, function(err) {
				console.log('Error', err);
			});
		}
	}
};

var pr = function(result) {
	console.log('Result:', JSON.stringify(result, null, 2));
};
var pe = function(err) {
	console.log('Error:', JSON.stringify(err, null, 2));
};
var lr = function(result) {
	console.log('Result:', result);
};
var le = function(err) {
	console.log('Error:', err);
};

