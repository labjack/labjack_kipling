console.log("ljswitchboard-core index.js");

var gui = require('nw.gui');
var path = require('path');
var q = require('q');
var win = gui.Window.get();

// Show the window's dev tools
win.showDevTools();

console.log('Checking shared object', typeof(win.shared));

var package_loader = require('ljswitchboard-package_loader');
var gns = package_loader.getNameSpace();



var loadResources = function(resources) {
	global[gns].static_files.loadResources(document, resources)
	.then(function(res) {
		console.log('Loaded Resources', res);
	}, function(err) {
		console.log('Error Loading resources', err);
	});
};



// win.shared.tFunc()
// .then(function(d) {
// 	console.log('ljswitchboard-core:', d);
// });