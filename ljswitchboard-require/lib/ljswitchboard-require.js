
// var rek = require('rekuire');
var path = require('path');

var curPath = path.dirname(module.parent.filename);

function createRequire() {
    this.searchDirectories = [];

    this.require = function(libName, DEBUG) {
        var module;
        if(DEBUG) {
            console.log(" - Searching for: ", libName, module);
        }
        for(var i = 0; i < self.searchDirectories.length; i++) {
            var searchDirectory = self.searchDirectories[i];
            var reqStr = searchDirectory + '/node_modules/' + libName;
            var secReqStr = searchDirectory + '/' + libName;
            try {
                if(DEBUG) {
                    console.log(" - T.1", reqStr);
                }
                module = require(reqStr);
                return module;
            } catch(err) {
                try {
                    if(DEBUG) {
                        console.log(" - T.2", secReqStr);
                    }
                    module = require(secReqStr);
                    return module;
                } catch(error) {
                    if(DEBUG) {
                        console.log(" - ERR", error.code, searchDirectory);
                    }
                }
            }
        }
        function requireError(message, code) {
            this.message = message;
            this.code = code;
        }
        var errorMessage = {
            'message': "Can not find module '" + libName + "'",
            'code': 'MODULE_NOT_FOUND'
        };
        throw new requireError(errorMessage.message, errorMessage.code);
    };
    this.addRootDirectories = function(directories) {
        directories.forEach(function(directory) {
            self.addRootDirectory(directory);
        });
    };
    this.addRootDirectory = function(directory) {
        if(self.searchDirectories.indexOf(directory) === -1) {
            self.searchDirectories.push(directory);
        }
    };
    var self = this;

    self.addRootDirectory('');
    self.addRootDirectory('.');
    self.addRootDirectory(curPath.split(path.sep).join('/'));
    self.addRootDirectory(process.cwd().split(path.sep).join('/'));
}
var LJS_REQUIRE = new createRequire();



exports.require = LJS_REQUIRE.require;
exports.addDirectory = LJS_REQUIRE.addRootDirectory;
exports.addDirectories = LJS_REQUIRE.addRootDirectories;
exports.getDirectories = function() {
    return LJS_REQUIRE.searchDirectories;
};