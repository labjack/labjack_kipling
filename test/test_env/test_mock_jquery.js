var jquery = require('./mock_jquery');
var $ = jquery.jquery;

var a = $('aa');
a.on('click', function(){console.log('!!! click callback !!!');});
a.on('clickB', {'data': 'testData'}, function(eventData) {
	console.log('!!! clickB callback', eventData.data);
});
var b = $('aa');
// console.log(b);

b.trigger('click');
b.trigger('clickB');