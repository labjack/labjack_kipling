'use strict';

const electron = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

const originalConsole = global.console;


function formatParam(param, max) {
    if (!max) {
        max = 1000 * 10000;
    }

    if (!param) {
        return param;
    }

    if (Object(param) === param) {
        return JSON.stringify(param, null, 2).substr(0, max);
    }
    if (Array.isArray(param)) {
        return JSON.stringify(param, null, 2).substr(0, max);
    }

    return param;
}

function format(message) {
    const source = ' ' + message.source;

    // Colors: https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color#41407246
    switch (message.level) {
        case 'error':
            return '\x1b[31m[' + message.now.toISOString() + source + ']\x1b[0m ' + message.data.map(p => formatParam(p, 1000)).join(' ');
        default:
            return '[' + message.now.toISOString() + source + ']\x1b[0m ' + message.data.map(p => formatParam(p, 1000)).join(' ');
    }
}

/**
 * Writes log to file
 *
 * on Linux: ~/.config/{app name}/logs/{date}.log
 * on macOS: ~/Library/Application Support/{app name}/logs/{date}.log
 * on Windows: %USERPROFILE%\AppData\Roaming\{app name}\logs\{date}.log
 */
class FileTransport {
    constructor() {
        const now = new Date();
        fs.mkdirSync(path.join(electron.app.getPath('userData'), 'logs'), {
            recursive: true
        });
        this.filePath = path.join(electron.app.getPath('userData'), 'logs', now.toISOString()) + '.log';
        this.handle = fs.openSync(this.filePath, 'a');
    }

    output(message) {
        const now = new Date();
        const source = ' ' + message.source;
        const buffer = message.level.substr(0, 1).toUpperCase() + '[' + now.toISOString() + source + '] ' + message.data.map(formatParam).join(' ') + os.EOL;
        fs.writeFileSync(this.handle, buffer);
    }
}

class ConsoleTransport {
    constructor() {
    }

    output(message) {
        originalConsole.log(format(message));
    }
}

class Logger {

    constructor() {
        this.transports = [];
        this.transports.push(new ConsoleTransport());
        this.transports.push(new FileTransport());
    }

    log(...args) {
        const now = new Date();
        for (const transport of this.transports) {
            transport.output({
                now,
                level: 'log',
                data: args,
                source: 'main'
            });
        }
    }
    error(...args) {
        let initiator = 'main';
        try {
            throw new Error();
        } catch (e) {
            if (typeof e.stack === 'string') {
                let isFirst = true;
                for (const line of e.stack.split('\n')) {
                    const matches = line.match(/^\s+at\s+(.*)/);
                    if (matches) {
                        if (!isFirst) { // first line - current function
                            // second line - caller (what we are looking for)
                            initiator = matches[1];
                            break;
                        }
                        isFirst = false;
                    }
                }
            }
        }

        const now = new Date();
        for (const transport of this.transports) {
            transport.output({
                now,
                level: 'error',
                data: args,
                source: initiator
            });
        }
    }
    warn(...args) {
        const now = new Date();
        for (const transport of this.transports) {
            transport.output({
                now,
                level: 'warn',
                data: args,
                source: 'main'
            });
        }
    }
    info(...args) {
        const now = new Date();
        for (const transport of this.transports) {
            transport.output({
                now,
                level: 'info',
                data: args,
                source: 'main'
            });
        }
    }
    browserOutput(message) {
        for (const transport of this.transports) {
            transport.output(message);
        }
    }
    trace(...args) {
        originalConsole.trace(...args);
    }
    debug(...args) {
        originalConsole.debug(...args);
    }

    getLogFilePath() {
        for (const transport of this.transports) {
            if (transport.filePath) {
                return transport.filePath;
            }
        }
    }

}

const logger = new Logger();

global.mainLogger = logger;
logger.originalConsole = originalConsole;
global.console = logger;
/*
for (const level of ['log', 'error', 'warn', 'info']) {
    global.console[level] = logger[level];
}
*/
