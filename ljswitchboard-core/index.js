console.log("ljswitchboard-core index.js");

var gui = require('nw.gui');
var q = require('q');
var win = gui.Window.get();


console.log('Checking shared object', typeof(win.shared));

win.shared.tFunc()
.then(function(d) {
	console.log('ljswitchboard-core:', d);
});