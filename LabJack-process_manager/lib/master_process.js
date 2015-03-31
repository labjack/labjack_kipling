/**
 * The master_process is in charge of creating and destructing child
 * process and initiating any sendReceive type communication.
 *
 * @author Chris Johnson (LabJack Corp.)
**/

var child_process = require('child_process');
var dict = require('dict');
var q = require('q');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var stream = require('stream');
var fs = require('fs');

// include various constants from the constants file
var pm_constants = require('./process_manager_constants');
var PM_MESSAGE = pm_constants.message;
var PM_STOP_CHILD_PROCESS = pm_constants.stopChildProcess;
var PM_GET_PROCESS_INFO = pm_constants.getProcessInfo;
var PM_CHILD_PROCESS_STARTED = pm_constants.childProcessStarted;
var PM_EMIT_MESSAGE = pm_constants.emitMessage;

var createStreamInterface = false;

var IS_DEBUG = false;
var print = function(argA, argB) {
    if(IS_DEBUG) {
        var msg = 'PM:';
        if(argA) {
            if(argB) {
                console.log(msg, argA, argB);
            } else {
                console.log(msg, argA);
            }
        } else {
            console.log(msg);
        }
    }
};


/**
 * Possible events that the process manager can emit:
**/
var PM_MESSAGE_BUFFER_FULL = 'messageBufferFull';
var PM_RECEIVED_MESSAGE_INVALID = 'ReceivedInvalidMessage';
var PM_CRITICAL_ERROR = 'criticalError';

// Some debugging constants
var NUM_PROCESSES_MANAGERS_CREATED = 0;
var NUM_MASTER_PROCESSES_CREATED = 0;

function createNewProcessManager() {
    NUM_PROCESSES_MANAGERS_CREATED += 1;
    // This is the object where the child process will get saved
    var subProcess;
    var receivedDisconnectMessage = false;
    var receivedExitMessage = false;
    var internalMessages = [
        PM_STOP_CHILD_PROCESS,
        PM_CHILD_PROCESS_STARTED,
        PM_GET_PROCESS_INFO
    ];

    this.getSubprocess = function() {
        return subProcess;
    };
    var isInternalMessage = function(messageType) {
        var isInternalMessage = false;
        if(internalMessages.indexOf(messageType) >= 0) {
            isInternalMessage = true;
        }
        return isInternalMessage;
    };

    //  These variables will be used to create, manage, and execute async messages.
    var messageCounter;
    var messageBuffer;
    var messageBufferMaxSize = 50000;

    var initializeMessageManaggement = function() {
        messageCounter = 0;
        messageBuffer = dict();
    };
    var addStartupListenerKey = function() {
        var startupListener = q.defer();
        
        var messageInfo = {};
        messageInfo.id = PM_CHILD_PROCESS_STARTED;
        messageInfo.type = PM_CHILD_PROCESS_STARTED;
        messageInfo.reject = startupListener.reject;
        messageInfo.resolve = startupListener.resolve;

        // save the message object to the buffer
        messageBuffer.set(PM_CHILD_PROCESS_STARTED, messageInfo);

        return startupListener.promise;
    };
    // Get the next available messageId and increment the message counter
    var getNewMessageId = function() {
        var newMessageId = messageCounter.toString();
        if (messageCounter < messageBufferMaxSize) {
            messageCounter += 1;
        } else {
            messageCounter = 0;
        }
        return newMessageId;  
    };
    // Check to see if the messageId is already in use, if it is then the 
    // child process has to many outstanding messages and we need to perform
    // some sort of recovery option.
    var checkMessageId = function(messageId) {
        if (messageBuffer.has(messageId)) {
            console.error('in checkMessageId', PM_MESSAGE_BUFFER_FULL);
            var emitResult = self.emit(PM_MESSAGE_BUFFER_FULL, messageId);
            if(!emitResult) {
                throw new error(PM_MESSAGE_BUFFER_FULL);
            }
        }
    };
    var getMessageId = function(message) {
        return message.id;
    };
    var getMessageType = function(message) {
        return message.type;
    };

    var handleReceivedMessageError = function(bundle) {
        var errDefered = q.defer();
        errDefered.reject(bundle);
        return errDefered.promise;
    };
    var checkReceivedMessage = function(bundle) {
        var defered = q.defer();
        var messageId = getMessageId(bundle);
        if(messageId === PM_EMIT_MESSAGE) {
            var eventType = bundle.message.data.eventType;
            var eventData = bundle.message.data.data;
            var listeners = self.listeners(eventType);
            print('received:', PM_EMIT_MESSAGE);
            print(bundle.message.data, listeners);
            self.emit(eventType, eventData);
            defered.reject(bundle);
        } else {
            if(messageBuffer.has(messageId)) {
                bundle.isMessageValid = true;
                defered.resolve(bundle);
            } else {
                console.error('in checkReceivedMessage', PM_RECEIVED_MESSAGE_INVALID);
                var emitResult = self.emit(PM_RECEIVED_MESSAGE_INVALID);
                if(!emitResult) {
                    throw new error(PM_RECEIVED_MESSAGE_INVALID);
                }
                bundle.qRejectMessage = 'Invalid message received: ' + messageId.toString();
                defered.reject(bundle);
            }
        }
        return defered.promise;
    };
    var markMessageHandler = function(bundle) {
        var defered = q.defer();
        var messageType = getMessageType(bundle.message);
        if(isInternalMessage(messageType)) {
            bundle.isInternalMessage = true;
        } else {
            bundle.executeMessageCallback = true;
        }
        defered.resolve(bundle);
        return defered.promise;
    };
    var handleInternalMessage = function(bundle) {
        var defered = q.defer();
        if(bundle.isInternalMessage) {
            // handle internal message
            if(bundle.id === PM_CHILD_PROCESS_STARTED) {
                bundle.isHandled = false;
                bundle.executeMessageCallback = true;
            } else if(bundle.id === PM_EMIT_MESSAGE) {

            } else if(bundle.message.type === PM_GET_PROCESS_INFO) {
                bundle.isHandled = false;
                bundle.executeMessageCallback = true;
            } else if(bundle.message.type === PM_STOP_CHILD_PROCESS) {
                bundle.isHandled = false;
                bundle.executeMessageCallback = true;
            } else {
                console.log('internal message type encountered and not handled', bundle.message);
                bundle.isHandled = true;
            }
            defered.resolve(bundle);
        } else {
            defered.resolve(bundle);
        }
        return defered.promise;
    };
    var executeMessageCallback = function(bundle) {
        var defered = q.defer();
        
        if(!bundle.isHandled) {
            var savedCallback = messageBuffer.get(getMessageId(bundle));
            print('Executing Message Callback', bundle);
            if(bundle.message.isError) {
                if(bundle.message.errorType === 'userError') {
                    savedCallback.reject(bundle.data);
                    defered.resolve(bundle);
                    
                }
            } else {
                savedCallback.resolve(bundle.data);
                defered.resolve(bundle);
            }
        } else {
            defered.resolve(bundle);
        }
        return defered.promise;
    };
    var cleanupMessage = function(bundle) {
        print('cleanupMessage', bundle);
        if(bundle.isMessageValid) {
            messageBuffer.delete(getMessageId(bundle));
        }
        var defered = q.defer();
        var keys = Object.keys(bundle);
        keys.forEach(function(key) {
            bundle[key] = undefined;
            delete bundle[key];
        });
        bundle = undefined;
        defered.resolve();
        return defered.promise;
    };


    // ----------------- define any private functions: -------------------------
    //
    var errorListener = function(err) {
        print('errorListener', err);
        self.emit('error', err);
    };
    // exitListener takes one argument, it is the exit code of the child process.
    var exitListener = function(code) {
        print('exitListener', code);
        receivedExitMessage = true;
        self.emit('exit', code);
    };
    var closeListener = function(data) {
        print('closeListener', data);

        // If this event was thrown while the process hasn't been confirmed as
        // started then return an error.
        if(messageBuffer.has(PM_CHILD_PROCESS_STARTED)) {
            var startMessage = messageBuffer.get(PM_CHILD_PROCESS_STARTED);
            var info = {
                'message': 'Child process failed to start',
                'error': data
            };
            startMessage.reject(info);
        }

        self.emit('close', data);
    };
    var disconnectListener = function(data) {
        print('disconnectListener', data);
        receivedDisconnectMessage = true;
        self.emit('disconnect', data);
    };
    var messageListener = function(data) {
        print('messageListener', data);
        var receivedMessageBundle = {
            'qRejectMessage': '',
            'isMessageValid': false,
            'isInternalMessage': false,
            'executeMessageCallback': false,
            'isHandled': false,
            'message': data,
            'data': data.data,
            'id': data.id
        };
        checkReceivedMessage(receivedMessageBundle)
        .then(markMessageHandler,handleReceivedMessageError)
        .then(handleInternalMessage,handleReceivedMessageError)
        .then(executeMessageCallback,handleReceivedMessageError)
        .then(cleanupMessage, cleanupMessage);
    };
    var stdinListener = function(data) {
        console.log('in mp-stdinListener:', data.toString());
        print('stdinListener', data);
    };
    var stderrListener = function(data) {
        console.log('in mp-stderrListener:', data.toString());
        print('stderrListener', data);
    };

    
    // define any external interfaces
    this.startChildProcess = function(childProcessFilePath, options) {
        var startChildProcessDefered = q.defer();
        var deviceManagerSlaveLocation = childProcessFilePath;
        var deviceManagerSlaveArgs = [];
        var isSilent = false;
        
        var deviceManagerSlaveOptions = {};
        var validExecPath = false;
        if(options) {
            if(options.silent) {
                deviceManagerSlaveOptions.silent = options.silent;
                isSilent = options.silent;
            }
            if(options.cwd) {
                deviceManagerSlaveOptions.cwd = options.cwd;
            }
            if(options.execPath) {
                if(options.execPath !== '') {
                    validExecPath = true;
                    deviceManagerSlaveOptions.execPath = options.execPath;
                }
            }
            if(options.execArgv) {
                if(Array.isArray(options.execArgv)) {
                    deviceManagerSlaveOptions.execArgv = options.execArgv;
                }
            }
            if(options.spawnChildProcess) {
                deviceManagerSlaveOptions.spawnChildProcess = options.spawnChildProcess;
            }
            var envVars = process.env;
            envVars.slave_process_env = JSON.stringify(options);
            deviceManagerSlaveOptions.env = envVars;
        }

        // reset the messageCounter back to 0
        initializeMessageManaggement();

        if(deviceManagerSlaveOptions.spawnChildProcess && (validExecPath)) {
            // console.log("calling child_process.spawn");

            // Instruct the new node process to execute the defined .js file
            deviceManagerSlaveArgs.push(deviceManagerSlaveLocation);

            // append the stdio array to the options object
            deviceManagerSlaveOptions.stdio = [
                process.stdin,
                process.stdout,
                process.stderr,
                'ipc',
                'pipe',
                'pipe'
            ];
            subProcess = child_process.spawn(
                options.execPath,
                deviceManagerSlaveArgs,
                deviceManagerSlaveOptions
            );
            
            if(createStreamInterface) {
                // console.log("HERE", subProcess.stdio);
                self.subProcessPipe = subProcess.stdio[4];
                self.subProcessPipe.write(Buffer('awesome'));
                // console.log('here!', Object.keys(self.subProcessPipe));

                // trying to read data from a subprocess
                // console.log('here1', subProcess.stdio[5]);
                // console.log('here2', Object.keys(subProcess.stdio[5]));

                // var readStream = fs.createReadStream(null, {fd: 5});
                // console.log("hereA", readStream);
                // console.log("hereB", Object.keys(readStream));
                // console.log("hereC", readStream._events);

                var readStream = subProcess.stdio[5];
                readStream.on('readable', function() {
                    console.log("-! M: my piped data 0");
                    var chunk;
                    while (null !== (chunk = readStream.read())) {
                        console.log('-! got %d bytes of data', chunk.length, ':', chunk.toString('ascii'));
                    }
                });
                // readStream.on('readable', function() {
                //     console.log("my piped data 0");
                //     var chunk;
                //     while (null !== (chunk = readStream.read())) {
                //         console.log('got %d bytes of data', chunk.length);
                //     }
                // });
                // readStream.on('end', function() {
                //     console.log("readStream Ended");
                // });
                // readStream.on('error', function(err) {
                //     console.log("readStream Error", err);
                // });
                // self.bufferStream.pipe(pipe);
            }
        } else {
            // Enable to print out important just-before starting subprocess info
            if(false) {
                console.log('');
                console.log('Forking child_process');
                console.log('cwd', process.cwd());
                console.log('Starting Library', deviceManagerSlaveLocation);
                // console.log('Args', deviceManagerSlaveArgs);
                console.log('Starting cwd', deviceManagerSlaveOptions.cwd);
                console.log('Starting execPath', deviceManagerSlaveOptions.execPath);
                // deviceManagerSlaveArgs = {};
            }
            subProcess = child_process.fork(
                deviceManagerSlaveLocation,
                deviceManagerSlaveArgs,
                deviceManagerSlaveOptions
            );
        }
        

        /*
        Spawn parameters:
        command
        args
        options {
            cwd
            stdio
            customFds (deprecated)
            env
            detached
            uid
            gid
        }

        Fork parameters:
        modulePath
        args
        options {
            cwd
            env
            encoding
            execPath
            execArgv
            silent
        }
        */

        // Attach a wide variety of event listeners
        subProcess.on('error', errorListener);
        subProcess.on('exit', exitListener);
        subProcess.on('close', closeListener);
        subProcess.on('disconnect', disconnectListener);
        subProcess.on('message', messageListener);
        if(isSilent) {
            if(options.stdinListener) {
                subProcess.stdout.on('data', options.stdinListener);
            } else {
                subProcess.stdout.on('data', stdinListener);
            }
            if(options.stderrListener) {
                subProcess.stderr.on('data', options.stderrListener);
            } else {
                subProcess.stderr.on('data', stderrListener);
            }
        }  
        receivedDisconnectMessage = false;
        receivedExitMessage = false;

        addStartupListenerKey()
        .then(startChildProcessDefered.resolve, startChildProcessDefered.reject);
        return startChildProcessDefered.promise;
    };
    this.qSendInternalMessage = function(type, data) {
        var defered = q.defer();
        sendReceive(data, type)
        .then(defered.resolve, defered.reject);
        return defered.promise;
    };
    this.qSendReceiveMessage = function(m) {
        var defered = q.defer();
        sendReceive(m, PM_MESSAGE)
        .then(defered.resolve, defered.reject);
        return defered.promise;
    };
    this.sendReceiveMessage = function(m, onError, onSuccess) {
        var saveFunc = function(func) {
            return func;
        };
        self.qSendMessage(m)
        .then(saveFunc(onSuccess), saveFunc(onError));
    };
    this.sendMessage = function(m) {
        var defered = q.defer();
        sendEmitMessage(PM_EMIT_MESSAGE, m)
        .then(defered.resolve, defered.reject);
        return defered.promise;
    };
    this.emitMessage = function(type, m) {
        var defered = q.defer();
        sendEmitMessage(type.toString(), m)
        .then(defered.resolve, defered.reject);
        return defered.promise;
    };
    var sendReceive = function(m, type) {
        // create promise object
        var childProcessMessage = q.defer();

        // get and check the next available messageId
        var messageId = getNewMessageId();
        checkMessageId(messageId);

        // build a messageInfo object to be saved to the message buffer and is 
        // used to execute the saved promise objects when the messages response
        // is received.
        var messageInfo = {};
        messageInfo.id = messageId;
        messageInfo.type = type;
        messageInfo.reject = childProcessMessage.reject;
        messageInfo.resolve = childProcessMessage.resolve;

        // save the message object to the buffer
        messageBuffer.set(messageId, messageInfo);

        // build a newMessage object that wraps the message with a message id
        // that will later resolve or reject on the promise object.
        var newMessage = {};
        newMessage.id = messageId;
        newMessage.responseRequired = true;
        newMessage.type = type;
        newMessage.data = m;

        // send the newMessage object to the child process
        subProcess.send(newMessage);

        // return promise
        return childProcessMessage.promise;
    };
    var sendEmitMessage = function(type, m) {
        var defered = q.defer();
        var newMessage = {};
        newMessage.id = PM_EMIT_MESSAGE;
        newMessage.responseRequired = false;
        newMessage.type = type;
        newMessage.data = m;

        // send the newMessage object to the child process
        subProcess.send(newMessage);
        
        defered.resolve();
        return defered.promise;
    };

    this.stopChildProcess = function() {
        var defered = q.defer();
        stopOpenStreams()
        .then(informChildProcessToStop)
        .then(innerStopChildProcess)
        .then(defered.resolve, defered.reject);
        return defered.promise;
    };
    var stopOpenStreams = function() {
        var stopStreams = q.defer();
        if(self.subProcessPipe) {
            console.log("Closing subProcessPipe");
            self.subProcessPipe.end();
        }
        stopStreams.resolve();
        return stopStreams.promise;
    };
    var informChildProcessToStop = function() {
        var defered = q.defer();
        self.qSendInternalMessage(PM_STOP_CHILD_PROCESS,'')
        .then(defered.resolve, defered.reject);
        return defered.promise;
    };
    var innerStopChildProcess = function() {
        var stopDefered = q.defer();
        print('in stopChildProcess');
        subProcess.disconnect();
        var numIterations = 0;
        var maxIterations = 200;
        var loopTillSubprocessEnded = function() {
            if(receivedExitMessage && receivedDisconnectMessage) {
                print('Lost Messages due to stoppingChildProcess', messageBuffer.size);
                stopDefered.resolve({'numLostMessages': messageBuffer.size});
            } else {
                if(numIterations < maxIterations) {
                    setTimeout(loopTillSubprocessEnded, 10);
                } else {
                    stopDefered.reject('Failed to verify that subProcess was ended');
                }
            }
        };
        setTimeout(loopTillSubprocessEnded, 10);
        return stopDefered.promise;
    };

    EventEmitter.call(this);
    var self = this;
}
util.inherits(createNewProcessManager, EventEmitter);

function createNewMasterProcess() {
    NUM_MASTER_PROCESSES_CREATED += 1;

    this.masterProcess = undefined;

    var criticalErrorListener = function(err) {
        print('criticalError encountered', err);
    };
    var messageBufferFullListener = function(err) {
        print('messagebufferFull', err);
    };
    var receivedInvalidMessage = function(err) {
        print('invalid message received', err);
    };

    this.init = function(messageReceiver) {
        self.masterProcess = undefined;
        self.masterProcess = new createNewProcessManager();

        // Attach some event listeners to the self.masterProcess
        self.masterProcess.on(PM_CRITICAL_ERROR, criticalErrorListener);
        self.masterProcess.on(PM_MESSAGE_BUFFER_FULL, messageBufferFullListener);
        self.masterProcess.on(PM_RECEIVED_MESSAGE_INVALID, receivedInvalidMessage);

        // If a messageReceiver was given, assign it to listen to the PM_EMIT_MESSAGE event
        if(messageReceiver) {
            self.masterProcess.on(PM_EMIT_MESSAGE, messageReceiver);
        }

        return self.masterProcess;
    };
    this.start = function(processName, options, onError, onSuccess) {
        processManager.startChildProcess(processName, options)
        .then(onSuccess, onError);
    };
    this.qStart = function(processName, options) {
        return self.masterProcess.startChildProcess(processName, options);
    };
    this.stop = function(onError, onSuccess) {
        print('in stop');
        self.masterprocess.stopChildProcess()
        .then(onError, onSuccess);
    };
    this.qStop = function() {
        print('in qStop');
        return self.masterProcess.stopChildProcess();
    };

    this.sendReceive = function(m) {
        return self.masterProcess.qSendReceiveMessage(m);
    };
    this.sendMessage = function(m) {
        return self.masterProcess.sendMessage(m);
    };
    this.send = function(type, m) {
        return self.masterProcess.emitMessage(type, m);
    };

    this.getProcessInfo = function() {
        return self.masterProcess.qSendInternalMessage(PM_GET_PROCESS_INFO);
    };

    this.getEventEmitter = function() {
        return self.masterProcess;
    };

    var self = this;
}


// Start defining external interfaces
exports.createNewMasterProcess = createNewMasterProcess;

exports.getStats = function() {
    return {
        'numProcessManagersCreated': NUM_PROCESSES_MANAGERS_CREATED,
        'numMasterProcessesCreated': NUM_MASTER_PROCESSES_CREATED
    };
};