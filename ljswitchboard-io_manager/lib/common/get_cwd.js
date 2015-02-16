
var path = require('path');
var getCWD = function() {
	var cwd = '';
	if(module) {
		var moduleFileName = path.normalize(module.parent.filename);
		var curPath = path.dirname(moduleFileName);
		var rootDir = path.resolve(path.join(curPath,'..'));
		cwd = rootDir;
	} else {
		cwd = process.cwd();
	}
	return cwd;
};
exports.getCWD = getCWD;