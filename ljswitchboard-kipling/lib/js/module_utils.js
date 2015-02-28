
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