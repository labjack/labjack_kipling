var fs = require('fs');
var path = require('path');
var q = require('q');

function innerLoadConfigFile (bundle) {
    var defered = q.defer();
    var filePath = bundle.filePath;
    var errorsToRetry = [ /* 'ENOENT' // file does not exist error.*/]
    var preformRead = true;

    if(bundle.err){
        // if an error occurs then check to see if it is in the list of errors
        // that should be re-tried.
        preformRead = errorsToRetry.indexOf(bundle.err.code) >= 0;
    }

    if(preformRead) {
        fs.readFile(filePath, function(err, data){
            if(err){
                bundle.err = err;
                bundle.err.step = 'fs.readFile';
                bundle.err.str = err.toString();
                defered.reject(bundle);
            } else{
                var str = data.toString();
                try{
                    bundle.data = JSON.parse(str);
                    bundle.data.config_file_path = filePath;
                    defered.resolve(bundle);
                }catch(parseError) {
                    bundle.err = {
                        'code': 'Invalid .json file. ' + parseError.toString(),
                        'str': parseError.toString(),
                        'step': 'JSON.parse',
                    };
                    defered.reject(bundle);
                }
            }
        });
    } else {
        defered.reject(bundle);
    }
    return defered.promise;
}

function loadConfigFile(filePath) {
    var defered = q.defer();
    var result = {
        'isError': false,
        'data': {},
    };
    var fileExtension = path.extname(filePath);

    var succFunc = function(bundle) {
        result.data = bundle.data;
        defered.resolve(result);
    };
    var errorFunc = function(bundle) {
        result.isError = true;
        result.errorMessage = 'Failed to read the file with the error code: ';
        result.errorMessage += bundle.err.code;
        defered.reject(result);
    };

    if(fileExtension === '.json') {
        innerLoadConfigFile({
            'filePath': filePath,
            'data': {},
            'err': undefined,
        })
        .then(succFunc, innerLoadConfigFile)
        .then(succFunc, errorFunc);
        // if this doesn't work repete this three times
    } else {
        result.errorMessage = "config file must be a .json file. Tried to load file: ";
        result.errorMessage += path.basename(filePath);
        result.isError = true;
        defered.reject(result);
    }

    return defered.promise;
}
exports.loadConfigFile = loadConfigFile;