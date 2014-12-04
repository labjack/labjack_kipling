
var rek = require('rekuire');

function createRequire() {
	this.searchDirectories = [];
	this.searchDirectories.push('');

	this.require = function(libName) {
		console.log('name', libName, process.cwd());
		var module;
		var moduleFound = false;
		for(var i = 0; i < self.searchDirectories.length; i++) {
			var searchDirectory = self.searchDirectories[i];
			try {
				module = require(searchDirectory + '/' + libName);
				moduleFound = true;
				return module;
			} catch(err) {
				console.log('Not Found in searchDirectory');
			}
		}
	};
	this.addRootDirectories = function(directories) {
		self.searchDirectories.push.apply(self.searchDirectories, directories);
	};
	this.addRootDirectory = function(directory) {
		self.searchDirectories.push(directory);
	};
	var self = this;
}
var LJS_REQUIRE = new createRequire();

exports.require = LJS_REQUIRE.require;
exports.addDirectory = LJS_REQUIRE.addRootDirectory;
exports.addDirectories = LJS_REQUIRE.addRootDirectories;
exports.getDirectories = function() {
	return LJS_REQUIRE.searchDirectories;
};