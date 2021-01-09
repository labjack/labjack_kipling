'use strict';

/**
 * The master_process is in charge of creating and destructing child
 * process and initiating any sendReceive type communication.
 *
 * @author Chris Johnson (LabJack Corp.)
**/

const child_process = require('child_process');
const {EventEmitter} = require('events');

// include various constants from the constants file
const pm_constants = require('./process_manager_constants');
const PM_MESSAGE = pm_constants.message;
const PM_STOP_CHILD_PROCESS = pm_constants.stopChildProcess;
const PM_GET_PROCESS_INFO = pm_constants.getProcessInfo;
const PM_CHILD_PROCESS_STARTED = pm_constants.childProcessStarted;
const PM_EMIT_MESSAGE = pm_constants.emitMessage;

const createStreamInterface = false;

const IS_DEBUG = false;
const print2 = (argA, argB) => {
    if(IS_DEBUG) {
        const msg = 'PM:';
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
const PM_MESSAGE_BUFFER_FULL = 'messageBufferFull';
const PM_RECEIVED_MESSAGE_INVALID = 'ReceivedInvalidMessage';
const PM_CRITICAL_ERROR = 'criticalError';

// Some debugging constants
let NUM_PROCESSES_MANAGERS_CREATED = 0;
let NUM_MASTER_PROCESSES_CREATED = 0;

class NewProcessManager extends EventEmitter {

    constructor() {
        super();

        NUM_PROCESSES_MANAGERS_CREATED += 1;
        // This is the object where the child process will get saved
        this.receivedDisconnectMessage = false;
        this.receivedExitMessage = false;
        this.internalMessages = [
            PM_STOP_CHILD_PROCESS,
            PM_CHILD_PROCESS_STARTED,
            PM_GET_PROCESS_INFO
        ];

        //  These variables will be used to create, manage, and execute async messages.
        this.messageBufferMaxSize = 50000;
    }

    getSubprocess() {
        return this.subProcess;
    }

    isInternalMessage(messageType) {
        let isInternalMessage = false;
        if(this.internalMessages.indexOf(messageType) >= 0) {
            isInternalMessage = true;
        }
        return isInternalMessage;
    }

    initializeMessageManagement() {
        this.messageCounter = 0;
        this.messageBuffer = new Map();
    }

    addStartupListenerKey() {
        return new Promise((resolve, reject) => {
            const messageInfo = {};
            messageInfo.id = PM_CHILD_PROCESS_STARTED;
            messageInfo.type = PM_CHILD_PROCESS_STARTED;
            messageInfo.reject = reject;
            messageInfo.resolve = resolve;

            // save the message object to the buffer
            this.messageBuffer.set(PM_CHILD_PROCESS_STARTED, messageInfo);
        });
    }

    // Get the next available messageId and increment the message counter
    getNewMessageId() {
        const newMessageId = this.messageCounter.toString();
        if (this.messageCounter < this.messageBufferMaxSize) {
            this.messageCounter += 1;
        } else {
            this.messageCounter = 0;
        }
        return newMessageId;
    }

    // Check to see if the messageId is already in use, if it is then the
    // child process has to many outstanding messages and we need to perform
    // some sort of recovery option.
    checkMessageId(messageId) {
        if (this.messageBuffer.has(messageId)) {
            console.error('in checkMessageId', PM_MESSAGE_BUFFER_FULL);
            const emitResult = this.emit(PM_MESSAGE_BUFFER_FULL, messageId);
            if(!emitResult) {
                throw new Error(PM_MESSAGE_BUFFER_FULL);
            }
        }
    }

    getMessageId(message) {
        return message.id;
    }

    getMessageType(message) {
        return message.type;
    }

    checkReceivedMessage(bundle) {
        return new Promise((resolve, reject) => {
            const messageId = this.getMessageId(bundle);
            if(messageId === PM_EMIT_MESSAGE) {
                const eventType = bundle.message.data.eventType;
                const eventData = bundle.message.data.data;
                const listeners = this.listeners(eventType);
                print2('received:', PM_EMIT_MESSAGE);
                print2(bundle.message.data, listeners);
                this.emit(eventType, eventData);
                reject(bundle);
            } else {
                if (this.messageBuffer.has(messageId)) {
                    bundle.isMessageValid = true;
                    resolve(bundle);
                } else {
                    console.error('in checkReceivedMessage', PM_RECEIVED_MESSAGE_INVALID);
                    const emitResult = this.emit(PM_RECEIVED_MESSAGE_INVALID);
                    if(!emitResult) {
                        throw new Error(PM_RECEIVED_MESSAGE_INVALID);
                    }
                    bundle.qRejectMessage = 'Invalid message received: ' + messageId.toString();
                    reject(bundle);
                }
            }
        });
    }

    markMessageHandler(bundle) {
        const messageType = this.getMessageType(bundle.message);
        if (this.isInternalMessage(messageType)) {
            bundle.isInternalMessage = true;
        } else {
            bundle.executeMessageCallback = true;
        }
        return Promise.resolve(bundle);
    }

    async handleInternalMessage(bundle) {
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
            return bundle;
        } else {
            return bundle;
        }
    }

    async executeMessageCallback(bundle) {
        if(!bundle.isHandled) {
            const savedCallback = this.messageBuffer.get(this.getMessageId(bundle));
            print2('Executing Message Callback', bundle);
            if(bundle.message.isError) {
                if(bundle.message.errorType === 'userError') {
                    savedCallback.reject(bundle.data);
                    return bundle;
                }
            } else {
                savedCallback.resolve(bundle.data);
                return bundle;
            }
        } else {
            return bundle;
        }
    }

    cleanupMessage(bundle) {
        print2('cleanupMessage', bundle);
        if(bundle.isMessageValid) {
            this.messageBuffer.delete(this.getMessageId(bundle));
        }
        return new Promise((resolve) => {
            const keys = Object.keys(bundle);
            keys.forEach((key) => {
                bundle[key] = undefined;
                delete bundle[key];
            });
            bundle = undefined;
            resolve();
        });
    }

    // ----------------- define any private functions: -------------------------
    //
    errorListener(err) {
        print2('errorListener', err);
        this.emit('error', err);
    }

    // exitListener takes one argument, it is the exit code of the child process.
    exitListener(code) {
        print2('exitListener', code);
        this.receivedExitMessage = true;
        this.emit('exit', code);
    }

    closeListener(data) {
        print2('closeListener', data);

        // If this event was thrown while the process hasn't been confirmed as
        // started then return an error.
        if (this.messageBuffer.has(PM_CHILD_PROCESS_STARTED)) {
            const startMessage = this.messageBuffer.get(PM_CHILD_PROCESS_STARTED);
            const info = {
                'message': 'Child process failed to start',
                'error': data
            };
            startMessage.reject(info);
        }

        this.emit('close', data);
    }

    disconnectListener(data) {
        print2('disconnectListener', data);
        this.receivedDisconnectMessage = true;
        this.emit('disconnect', data);
    }

    messageListener(data) {
        print2('messageListener', data);
        const receivedMessageBundle = {
            'qRejectMessage': '',
            'isMessageValid': false,
            'isInternalMessage': false,
            'executeMessageCallback': false,
            'isHandled': false,
            'message': data,
            'data': data.data,
            'id': data.id
        };
        this.checkReceivedMessage(receivedMessageBundle)
            .then(bundle => this.markMessageHandler(bundle))
            .then(bundle => this.handleInternalMessage(bundle))
            .then(bundle => this.executeMessageCallback(bundle))
            .then(bundle => this.cleanupMessage(bundle), bundle => this.cleanupMessage(bundle));
    }

    stdinListener(data) {
        console.log('in mp-stdinListener:', data.toString());
        print2('stdinListener', data);
    }

    stderrListener(data) {
        console.log('in mp-stderrListener:', data.toString());
        print2('stderrListener', data);
    }

    // define any external interfaces
    startChildProcess(childProcessFilePath, options) {
        const deviceManagerSlaveLocation = childProcessFilePath;
        const deviceManagerSlaveArgs = [];
        let isSilent = false;

        const deviceManagerSlaveOptions = {};
        let validExecPath = false;
        if (options) {
            if (options.silent) {
                deviceManagerSlaveOptions.silent = options.silent;
                isSilent = options.silent;
            }
            if (options.cwd) {
                deviceManagerSlaveOptions.cwd = options.cwd;
            }
            if (options.execPath) {
                if (options.execPath !== '') {
                    validExecPath = true;
                    deviceManagerSlaveOptions.execPath = options.execPath;
                }
            }
            if (options.execArgv) {
                if (Array.isArray(options.execArgv)) {
                    deviceManagerSlaveOptions.execArgv = options.execArgv;
                }
            }
            if (options.spawnChildProcess) {
                deviceManagerSlaveOptions.spawnChildProcess = options.spawnChildProcess;
            }
            const envVars = process.env;
            envVars.slave_process_env = JSON.stringify(options);
            deviceManagerSlaveOptions.env = envVars;
        }

        // reset the messageCounter back to 0
        this.initializeMessageManagement();

        if (deviceManagerSlaveOptions.spawnChildProcess && (validExecPath)) {
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
            this.subProcess = child_process.spawn(
                options.execPath,
                deviceManagerSlaveArgs,
                deviceManagerSlaveOptions
            );

            if (createStreamInterface) {
                // console.log("HERE", subProcess.stdio);
                this.subProcessPipe = this.subProcess.stdio[4];
                this.subProcessPipe.write(new Buffer('awesome'));
                // console.log('here!', Object.keys(this.subProcessPipe));

                // trying to read data from a subprocess
                // console.log('here1', subProcess.stdio[5]);
                // console.log('here2', Object.keys(subProcess.stdio[5]));

                // const readStream = fs.createReadStream(null, {fd: 5});
                // console.log("hereA", readStream);
                // console.log("hereB", Object.keys(readStream));
                // console.log("hereC", readStream._events);

                const readStream = this.subProcess.stdio[5];
                readStream.on('readable', () => {
                    console.log("-! M: my piped data 0");
                    let chunk;
                    while (null !== (chunk = readStream.read())) {
                        console.log('-! got %d bytes of data', chunk.length, ':', chunk.toString('ascii'));
                    }
                });
            }
        } else {
            this.subProcess = child_process.fork(
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
        this.subProcess.on('error', data => this.errorListener(data));
        this.subProcess.on('exit', data => this.exitListener(data));
        this.subProcess.on('close', data => this.closeListener(data));
        this.subProcess.on('disconnect', data => this.disconnectListener(data));
        this.subProcess.on('message', data => this.messageListener(data));
        if (isSilent) {
            if (options.stdinListener) {
                this.subProcess.stdout.on('data', options.stdinListener);
            } else {
                this.subProcess.stdout.on('data', data => this.stdinListener(data));
            }
            if (options.stderrListener) {
                this.subProcess.stderr.on('data', options.stderrListener);
            } else {
                this.subProcess.stderr.on('data', data => this.stderrListener(data));
            }
        }
        this.receivedDisconnectMessage = false;
        this.receivedExitMessage = false;

        return this.addStartupListenerKey();
    }

    qSendInternalMessage(type, data) {
        return this.sendReceive(data, type);
    }

    qSendReceiveMessage(m) {
        return this.sendReceive(m, PM_MESSAGE);
    }

    sendReceiveMessage(m, onError, onSuccess) {
        const saveFunc = (func) => {
            return func;
        };
        this.qSendReceiveMessage(m).then(saveFunc(onSuccess), saveFunc(onError));
    }

    sendMessage(m) {
        return this.sendEmitMessage(PM_EMIT_MESSAGE, m);
    }

    emitMessage(type, m) {
        return this.sendEmitMessage(type.toString(), m);
    }

    sendReceive(m, type) {
        // create promise object
        return new Promise((resolve, reject) => {

            // get and check the next available messageId
            const messageId = this.getNewMessageId();
            this.checkMessageId(messageId);

            // build a messageInfo object to be saved to the message buffer and is
            // used to execute the saved promise objects when the messages response
            // is received.
            const messageInfo = {};
            messageInfo.id = messageId;
            messageInfo.type = type;
            messageInfo.reject = reject;
            messageInfo.resolve = resolve;

            // save the message object to the buffer
            this.messageBuffer.set(messageId, messageInfo);

            // build a newMessage object that wraps the message with a message id
            // that will later resolve or reject on the promise object.
            const newMessage = {};
            newMessage.id = messageId;
            newMessage.responseRequired = true;
            newMessage.type = type;
            newMessage.data = m;

            // send the newMessage object to the child process
            this.subProcess.send(newMessage);

            // return promise
        });
    }

    async sendEmitMessage(type, m) {
        const newMessage = {};
        newMessage.id = PM_EMIT_MESSAGE;
        newMessage.responseRequired = false;
        newMessage.type = type;
        newMessage.data = m;

        // send the newMessage object to the child process
        this.subProcess.send(newMessage);
    }

    stopChildProcess() {
        return this.stopOpenStreams()
            .then(() => this.informChildProcessToStop())
            .then(() => this.innerStopChildProcess());
    }

    stopOpenStreams() {
        if(this.subProcessPipe) {
            console.log("Closing subProcessPipe");
            this.subProcessPipe.end();
        }
        return Promise.resolve();
    }

    informChildProcessToStop() {
        return this.qSendInternalMessage(PM_STOP_CHILD_PROCESS,'');
    }

    innerStopChildProcess() {
       return new Promise((resolve) => {
           print2('in stopChildProcess');
           this.subProcess.disconnect();
           let numIterations = 0;
           const numToKill = 200;
           const maxIterations = 400;
           const loopTillSubprocessEnded = () => {
               numIterations += 1;
               if (this.receivedExitMessage && this.receivedDisconnectMessage) {
                   print2('Lost Messages due to stoppingChildProcess', this.messageBuffer.size);
                   resolve({'numLostMessages': this.messageBuffer.size});
               } else {
                   if (numIterations < maxIterations) {
                       if (numIterations === numToKill) {
                           console.log('Killing...');
                           this.subProcess.kill();
                       }
                       setTimeout(loopTillSubprocessEnded, 10);
                   } else {
                       console.log('Failed to verify ending...');
                       resolve({'numLostMessages': this.messageBuffer.size});
                   }
               }
           };
           setTimeout(loopTillSubprocessEnded, 10);
       });
    }
}

class NewMasterProcess {

    constructor() {
        NUM_MASTER_PROCESSES_CREATED += 1;

        this.masterProcess = undefined;
    }

    criticalErrorListener(err) {
        print2('criticalError encountered', err);
    }

    messageBufferFullListener(err) {
        print2('messagebufferFull', err);
    }

    receivedInvalidMessage(err) {
        print2('invalid message received', err);
    }

    init(messageReceiver) {
        this.masterProcess = new NewProcessManager();

        // Attach some event listeners to the this.masterProcess
        this.masterProcess.on(PM_CRITICAL_ERROR, err => this.criticalErrorListener(err));
        this.masterProcess.on(PM_MESSAGE_BUFFER_FULL, err => this.messageBufferFullListener(err));
        this.masterProcess.on(PM_RECEIVED_MESSAGE_INVALID, err => this.receivedInvalidMessage(err));

        // If a messageReceiver was given, assign it to listen to the PM_EMIT_MESSAGE event
        if(messageReceiver) {
            this.masterProcess.on(PM_EMIT_MESSAGE, messageReceiver);
        }

        return this.masterProcess;
    }

    start(processName, options, onError, onSuccess) {
        this.masterProcess.startChildProcess(processName, options).then(onSuccess, onError);
    }

    qStart(processName, options) {
        return this.masterProcess.startChildProcess(processName, options);
    }

    stop(onError, onSuccess) {
        print2('in stop');
        this.masterProcess.stopChildProcess().then(onError, onSuccess);
    }

    qStop() {
        print2('in qStop');
        return this.masterProcess.stopChildProcess();
    }

    sendReceive(m) {
        return this.masterProcess.qSendReceiveMessage(m);
    }

    sendMessage(m) {
        return this.masterProcess.sendMessage(m);
    }

    send(type, m) {
        return this.masterProcess.emitMessage(type, m);
    }

    getProcessInfo() {
        return this.masterProcess.qSendInternalMessage(PM_GET_PROCESS_INFO);
    }

    getEventEmitter() {
        return this.masterProcess;
    }
}

// Start defining external interfaces
exports.NewMasterProcess = NewMasterProcess;

exports.getStats = () => {
    return {
        'numProcessManagersCreated': NUM_PROCESSES_MANAGERS_CREATED,
        'numMasterProcessesCreated': NUM_MASTER_PROCESSES_CREATED
    };
};
