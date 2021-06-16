'use strict';

const fs = require('fs');
const path = require('path');

const package_loader = global.package_loader;
const handleBarsService = package_loader.getPackage('handleBarsService');

const FS_FACADE_TEMPLATE_CACHE = new Map();
exports.numCachedTemplates = function() {
    return FS_FACADE_TEMPLATE_CACHE.size;
};

exports.clearCache = function() {
    FS_FACADE_TEMPLATE_CACHE.clear();
};

/**
 * Render a Handlebars template.
 *
 * @param {String} location The location of the template to render.
 * @param {Object} context The context to render the template with.
 * @param {function} onError The function to call if an error is encountered
 *      while rendering the template. Should take a single argument which
 *      would be the error.
 * @param {function} onSuccess The function to call after the template is
 *      successfully rendered. Should take a single argument which would
 *      be the String rendred html.
**/
exports.renderTemplate = function(location, context, onError, onSuccess) {
    if (FS_FACADE_TEMPLATE_CACHE.has(location)) {
        const curTemplate = FS_FACADE_TEMPLATE_CACHE.get(location);
        onSuccess(curTemplate(context));
    } else {
        fs.exists(location, function(exists) {
            if (exists) {
                fs.readFile(location, 'utf8',
                    function (error, template) {
                        if (error) {
                            onError(error);
                        } else {
                            const curTemplate = handleBarsService._compileTemplate(template);
                            FS_FACADE_TEMPLATE_CACHE.set(location,curTemplate);
                            onSuccess(curTemplate(context));
                        }
                    }
                );
            } else {
                onError(new Error('Template ' + location + ' could not be found.'));
            }
        });
    }
};

const renderTemplateData = function(template, context) {
    return new Promise((resolve, reject) => {
        try {
            const curTemplate = handleBarsService._compileTemplate(template);
            const data = curTemplate(context);
            resolve(data);
        } catch (err) {
            resolve('');
        }
    });
};
exports.renderTemplateData = renderTemplateData;

exports.renderCachedTemplateData = function(key, template, context) {
	return new Promise((resolve, reject) => {
        if (FS_FACADE_TEMPLATE_CACHE.has(key)) {
            const curTemplate = FS_FACADE_TEMPLATE_CACHE.get(key);
            resolve(curTemplate(context));
        } else {
            const curTemplate = handleBarsService._compileTemplate(template);
            FS_FACADE_TEMPLATE_CACHE.set(key, curTemplate);
            resolve(curTemplate(context));
        }
    });
};

/*
Required functions for lua debugger module to work:

Function calls in controller.js:
1. fs_facade.getFileLoadID()
    Returns a constant "#file-dialog-hidden" (handles the file IO window)
2. fs_facade.readModuleFile(fileLocation, onError, onSuccess)
    Appends a file path with the location of all module files, checks to see if
    it is there and then reads it.
Function calls in helperFunctions.js:
1. fs_facade.readModuleFile(fileLocation, onError, onSuccess)
    Appends a file path with the location of all module files, checks to see if
    it is there and then reads it.

Function calls in luaDeviceController.js:
1. fs_facade.saveDataToFile(filePath, scriptData, onError, onSuccess);
    Checks for a file and writes data to it.  (This may have bugs according to
    caleb's testing.)
2. fs_facade.getFileSaveAsID()
    Returns a constant "#file-save-dialog-hidden"
3. fs_facade.getDefaultFilePath()
    Returns a constant that is platform based.
4. fs_facade.loadFile(filePath, onError, onSuccess)
    Is a wrapper around the fs.exists & fs.readFile functions.
5. fs_facade.readModuleFile(fileLocation, onError, onSuccess)
    Appends a file path with the location of all module files, checks to see if
    it is there and then reads it.

*/

const fileSaveAsID = "#file-save-dialog-hidden";
const getFileLoadID = "#file-dialog-hidden";

let windowsDefaultFilePath = 'C:\\Windows';

if(process.env.HOME) {
    windowsDefaultFilePath = process.env.HOME;
}

const defaultFilePath = {
    'linux': '/home/path',
    'linux2': '/home/path',
    'sunos': '/home/path',
    'solaris': '/home/path',
    'freebsd': '/home/path',
    'openbsd': '/home/path',
    'darwin': process.env.HOME,
    'mac': process.env.HOME,
    'win32': windowsDefaultFilePath,
    'win64': windowsDefaultFilePath
}[process.platform];
exports.testFunction = function() {
    return "testing...";
};
exports.getFileSaveAsID = function() {
    return fileSaveAsID;
};
exports.getFileLoadID = function() {
    return getFileLoadID;
};
exports.getDefaultFilePath = function() {
    return defaultFilePath;
};

exports.saveDataToFile = function(location, data, onError, onSuccess) {
    fs.exists(location, function(exists) {
        fs.writeFile(
            location,
            data,
            function (err) {
                if (err) {
                    onError(err);
                } else {
                    onSuccess();
                }
            }
        );
    });
};

exports.loadFile = function(location, onError, onSuccess) {
    fs.exists(location, function(exists) {
        if (exists) {
            fs.readFile(location, 'utf8',
                function (error, contents) {
                    if (error) {
                        fs.readFile(location, 'utf8',
                            function (error, contents) {
                                if (error) {
                                    onError(error);
                                } else {
                                    onSuccess(contents);
                                }
                            }
                        );
                    } else {
                        onSuccess(contents);
                    }
                }
            );
        } else {
            const error = new Error('Could not find File at ' + location + '.');
            onError(error);
        }
    });
};

exports.getExternalURI = function(filePath) {
    const module_manager = package_loader.getPackage('module_manager');
    const modulesDir = module_manager.getModulesDirectory();
    return path.normalize(path.join(modulesDir, filePath));
};
exports.readModuleFile = function(filePath, onError, onSuccess) {
    const fullPath = exports.getExternalURI(filePath);
    fs.exists(fullPath, function(exists) {
        if (exists) {
            fs.readFile(fullPath, 'utf8',
                function (error, contents) {
                    if (error) {
                        onError(error);
                    } else {
                        onSuccess(contents);
                    }
                }
            );
        } else {
            const error = new Error(
                'Could not find modules info at ' + fullPath + '.'
            );
            onError(error);
        }
    });
};
