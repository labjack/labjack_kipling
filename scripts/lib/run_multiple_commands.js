// run_multiple_commands.js
"use strict";

// Requirements
var fs = require('fs');
var async = require('async');
var q = require('q');
var path = require('path');
var child_process = require('child_process');


exports.run_multiple_commands = function(npmCommands) {
    function getCWD(cmd) {
        if(cmd.indexOf('/build_scripts/') >= 0) {
            return path.join(process.cwd(), '@labjack', 'ljswitchboard-builder');
        } else {
            return process.cwd();
        }
    }

    var commands = [];
    var pkgInfo = require('../../package.json');
    var scripts = pkgInfo.scripts;
    npmCommands.forEach(function(npmCmd) {
        if(typeof(scripts[npmCmd]) !== 'undefined') {
            // console.log('Adding npm cmd', npmCmd, scripts[npmCmd]);
            commands.push(scripts[npmCmd]);
        } else {
            // console.log('add cmd:', npmCmd, 'to the package.json file');
            commands.push(npmCmd);
        }
    });
    function findNPMCmd(cmdStr) {
        var npmCmdStr = cmdStr;
        try {
            var index = commands.indexOf(cmdStr);
            npmCmdStr = npmCommands[index];
        } catch(err) {}

        return npmCmdStr;
    }
    function printStatusInfo(cmdStr) {
        // console.log('printing status for cmd', cmdStr,commands,npmCommands);
        var npmcmdStr = findNPMCmd(cmdStr);
        var cmdIndex = commands.indexOf(cmdStr);
        var numCmds = commands.length;
        // console.log('npmcmdStr',npmcmdStr);
        // console.log('cmdIndex',cmdIndex);
        // console.log('numCmds',numCmds);
        
        var cmdNum = cmdIndex + 1;
        var statusStr = 'Data from command "' + npmcmdStr +'", step (';
        statusStr += cmdNum.toString() +'/'+numCmds.toString()+') ';
        
        var stopTime = new Date();
        var elapsedTime = ((stopTime - startTime)/1000).toFixed(3);
        statusStr += 'time elapsed: ' + elapsedTime.toString() + 's';

        console.log(statusStr);
        console.log('Current Time', stopTime);
    }

    function runCommand(cmd) {
        var defered = q.defer();

        var receivedCloseMessage = false;
        var receivedExitMessage = false;
        var isError = false;

        function finishFunc(code) {
            if(receivedExitMessage && receivedCloseMessage) {
                if(isError) {
                    defered.reject();
                } else {
                    defered.resolve();
                }
            }
        }
        function errorListener(data) {
            console.log('in errorListener',data);
            finishFunc();
        }
        function exitListener(data) {
            receivedExitMessage = true;
            console.log('in exitListener',data);
            if(data !== 0) {
                isError = true;
            }
            finishFunc();
        }
        function closeListener(data) {
            receivedCloseMessage = true;
            console.log('in closeListener',data);
            if(data !== 0) {
                isError = true;
            }
            finishFunc();
        }
        function disconnectListener(data) {
            console.log('in disconnectListener',data);
            finishFunc();
        }
        function messageListener(data) {
            // console.log('in messageListener',data);
        }
        function stdinListener(data) {
            printStatusInfo(cmd);
            // console.log('Data from running cmd:', findNPMCmd(cmd));
            console.log(data.toString());
        }
        function stderrListener(data) {
            // console.log('Data from running cmd:', findNPMCmd(cmd));
            printStatusInfo(cmd);
            console.log(data.toString());
        }

        var subProcess = child_process.exec(
            cmd,
            {
                cwd:getCWD(cmd),
            });
        subProcess.on('error', errorListener);
        subProcess.on('exit', exitListener);
        subProcess.on('close', closeListener);
        subProcess.on('disconnect', disconnectListener);
        subProcess.on('message', messageListener);
        subProcess.stdout.on('data', stdinListener);
        subProcess.stderr.on('data', stderrListener);

        return defered.promise;
    }



    console.log('Running npm commands', npmCommands, commands);
    var startTime = new Date();
    async.eachSeries(
        commands,
        function(cmd, cb, i) {
            console.log('Running command', cmd);
            runCommand(cmd)
            .then(function() {
                console.log('Finished running command', cmd);
                cb();
            }, function(err) {
                var index = commands.indexOf(cmd);
                console.log('Failed to run the command:', npmCommands[index]);
                process.exit(err);
            });
        },
        function(err) {
            var stopTime = new Date();
            var elapsedTime = ((stopTime - startTime)/1000).toFixed(3);
            console.log('Finished',elapsedTime);
        });
};


















// child_process.execSync('git pull');

// const subprocess = child_process.spawn('ls', {
//   stdio: [
//     0, // Use parent's stdin for child
//     'pipe', // Pipe child's stdout to parent
//     // fs.openSync('err.out', 'w') // Direct child's stderr to a file
//   ]
// });


// // append the stdio array to the options object
// deviceManagerSlaveOptions.stdio = [
//     process.stdin,
//     process.stdout,
//     process.stderr,
//     // 'ipc',
//     // 'pipe',
//     // 'pipe'
// ];
// subProcess = child_process.spawn(
//     options.execPath,
//     // deviceManagerSlaveArgs,
//     // deviceManagerSlaveOptions
// );
// subProcess.on('error', errorListener);
// subProcess.on('exit', exitListener);
// subProcess.on('close', closeListener);
// subProcess.on('disconnect', disconnectListener);
// subProcess.on('message', messageListener);
// if(isSilent) {
//     if(options.stdinListener) {
//         subProcess.stdout.on('data', options.stdinListener);
//     } else {
//         subProcess.stdout.on('data', stdinListener);
//     }
//     if(options.stderrListener) {
//         subProcess.stderr.on('data', options.stderrListener);
//     } else {
//         subProcess.stderr.on('data', stderrListener);
//     }
// }  
    
