// submodule_commander.js
"use strict";

var fs = require('fs');
var path = require('path');
var child_process = require('child_process');

// Utility class SubmoduleCommander to help execute a command in multiple
// submodules.
class SubmoduleCommander {
    constructor(argv) {
        this.argv = argv;

        var which = this.argv.which;
        if (Array.isArray(this.argv.which)) {
            which = this.argv.which[this.argv.which.length - 1];
        }
        if (which === 'all') {
            this.submodules = exports.getAllSubmodules();
        }
        else {
            this.submodules = exports.getCoreSubmodules();
        }

        this.ignoredCount = 0;
    }

    // Executes the given command in each of the submodules.
    commandSubmodules() {
        if (this.argv.hidden_debug) {
            console.log('this.argv ', this.argv);
        }

        var repoStatuses = {};
        this.submodules.forEach(function(folder) {
            repoStatuses[folder] = {
                'folder': folder,
                'isSuccessful': false
            };
        });

        var startingDir = process.cwd();
        this.submodules.forEach(function(folder) {
            var workDir = path.join(startingDir, folder);
            process.chdir(workDir);

            try {
                var output = child_process.execSync(this.argv.command);
                this.conditionallyOutput(workDir, output);
                repoStatuses[folder].isSuccessful = true;
            } catch (err) {
                console.log('CMD:',this.argv.command);
                console.log(`Error in ${workDir}`);
                if (this.argv.hidden_debug) {
                    console.log(err);
                }
                repoStatuses[folder].isSuccessful = false;
            }

            // Navigate back to the starting directory
            process.chdir(startingDir);
        }, this);

        var isPassed = true;
        var failedStr = '';
        Object.keys(repoStatuses).forEach(function(repoStatusKey) {
            var repoStatus = repoStatuses[repoStatusKey];
            if(!repoStatus.isSuccessful) {
                isPassed = false;
                failedStr += 'Failed Repo: ' + repoStatus.folder + '\r\n';
            }
        });

        if (this.argv.summary_out) {
            printStatuses(repoStatuses);
        }
        if (!this.argv.quiet && this.ignoredCount !== 0) {
            console.log(`${this.ignoredCount} submodules of ${this.submodules.length} were ${this.argv.ignore_message}`);
        }

        if(!isPassed) {
            console.log('FAILED:');
            console.log(failedStr);
            process.exitCode = 1;
        }
    }

    conditionallyOutput(workDir, output) {
        if (this.argv.quiet) {
            return;
        }

        var outstr = output.toString();
        if (this.argv.ignore && RegExp(this.argv.ignore).test(outstr)) {
            this.ignoredCount += 1;
            return;
        }

        if (this.argv.dir_out) {
            console.log(workDir);
        }

        if (this.argv.command_out) {
            console.log(outstr);
        }
    }
}
exports.SubmoduleCommander = SubmoduleCommander;


// Return the path of each submodule, whether or not submodules are initialized.
// Returns something like:
//     ['ljswitchboard-builder', 'subdirectory/other_submodule']
exports.getAllSubmodules = getAllSubmodules;
function getAllSubmodules() {
    // var gitConfigFilePath = path.join(process.cwd(),)
    var gitConfigFilePath = path.resolve(path.join(__dirname, '..', '..', '.git', 'config'));
    var fileData = fs.readFileSync(gitConfigFilePath).toString();

    var SUBMODULE_REGEX = /(?:\[submodule \").*(?:\"\])/g
    var match = SUBMODULE_REGEX.exec(fileData);
    var libs = [];
    while(match != null) {
        var libStr = match[0].split('[submodule "').join('').split('"]').join('');
        libs.push(libStr);
        match = SUBMODULE_REGEX.exec(fileData);
    }
    // https://stackoverflow.com/questions/12641469/list-submodules-in-a-git-repository
    // var submodules = child_process.execSync(
    //     "git config --file .gitmodules --get-regexp path | awk '{ print $2 }'"
    // );
    // return submodules.toString().split('\n').filter(word => word.length > 0);
    
    return libs;
}

exports.getCoreSubmodules = getCoreSubmodules;
function getCoreSubmodules() {
    var ljswitchboardBuilderPackageInfo = require('../../@labjack/ljswitchboard-builder/package.json');
    var currentFiles = ljswitchboardBuilderPackageInfo.kipling_dependencies;
    var ignoredFolders = ['.git'];
    var currentFolders = currentFiles.filter(function(fileName) {
        // Determine if the found fileName is a directory
        var isDir = fs.statSync(path.join('.',fileName)).isDirectory();

        // Determine if the found fileName should be ignored
        var isIgnored = ignoredFolders.indexOf(fileName) >= 0;

        // If the fileName is a directory and shouldn't be ignored then return true.
        // (indicating that the fileName passes the filter)
        return isDir && !isIgnored;
    });
    return currentFolders;
}

// Print the progress and success/fail state of all subrepos
var printStatuses = function(completionStates) {
    var numSteps = 0;
    var numCompleted = 0;
    var messages = [];

    var minSize = 35;
    for (var subrepo in completionStates) {
        var state = completionStates[subrepo];
        if(state.isSuccessful) {
            numCompleted += 1;
        }

        var nameSize = state.folder.length;
        var numExtraSpaces = minSize - nameSize;
        var message = state.folder.toString();
        for(var i = 0; i < numExtraSpaces; i++) {
            message += ' ';
        }
        message += '\t| ' + state.isSuccessful.toString();
        // message += '|' + nameSize.toString();
        messages.push(message);

        numSteps += 1;
    }
    var percentComplete = ((numCompleted/numSteps)*100).toFixed(1);
    console.log('');
    console.log('');
    console.log('');
    console.log('Success:', percentComplete + '%');
    var headerMessage = 'Package:';
    var headerLen = headerMessage.length;
    for(let i = 0; i < (minSize - headerLen); i++) {
        headerMessage += ' ';
    }
    headerMessage += '\t| succ';
    console.log(headerMessage);
    messages.forEach(function(message) {
        console.log(message);
    });
};
