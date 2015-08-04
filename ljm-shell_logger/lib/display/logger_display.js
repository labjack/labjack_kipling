
var q = require('q');
var chalk = require('chalk');
var term = require('terminal-control').init().autoClean();





function CREATE_LOGGER_DISPLAY () {

    this.windowSections = {
        'controls': {},
        'active_window': {},
        'active_instruction': '',
        'instruction_output': '',
        'log_data': [],
    };
    this.new_window_data = true;
    this.temporary_disable_window_clear = false;
    this.getIsNewWindowData = function() {
        return self.new_window_data;
    };
    this.setActiveInstruction = function(name) {
    // exports.setActiveInstruction = function(name) {
        self.windowSections.active_instruction = name;
        self.new_window_data = true;
    };
    this.setResult = function(message) {
        self.windowSections.instruction_output = message;
        self.new_window_data = true;
    };
    this.disableWindowClear = function() {
        self.temporary_disable_window_clear = true;
    };

    this.buffered_window_data = {};

    this.bufferWindowData = function() {
        var defered = q.defer();
        self.new_window_data = false;
        try {
            var strData = JSON.stringify(self.windowSections);
            self.buffered_window_data = JSON.parse(strData);
            defered.resolve();
        } catch(err) {
            // err...
            defered.reject('Failed in bufferWindowData');
        }
        return defered.promise;
    };
    this.clearWindow = function() {
        var defered = q.defer();
        if(!self.temporary_disable_window_clear) {
            term.clearScreen();
        }
        self.temporary_disable_window_clear = false;
        defered.resolve();
        return defered.promise;
    };
    this.drawBufferedData = function() {
        var defered = q.defer();
        console.log('Current Window', self.numRefreshes);
        console.log(self.buffered_window_data.active_instruction);
        console.log(self.buffered_window_data.instruction_output);
        defered.resolve();
        return defered.promise;
    };
    this.drawWindow = function() {
        var defered = q.defer();
        self.bufferWindowData()
        .then(self.clearWindow, defered.reject)
        .then(self.drawBufferedData, defered.reject)
        .then(defered.resolve, defered.reject);
        return defered.promise;
    };

    this.numRefreshes = 0;
    this.window_refresh_rate_ms = 100;

    this.handleDrawWindowSuccess = function() {
        var defered = q.defer();
        self.numRefreshes += 1;
        defered.resolve();
        return defered.promise;
    };
    this.handleDrawWindowError = function(errData) {
        var defered = q.defer();
        console.log('errData', errData);
        self.numRefreshes += 1;
        defered.resolve();
        return defered.promise;
    };
    this.updateWindow = function() {
        if(self.getIsNewWindowData()) {
            self.drawWindow()
            .then(
                self.handleDrawWindowSuccess,
                self.handleDrawWindowError
            ).then(function() {
                setTimeout(self.updateWindow, self.window_refresh_rate_ms);
            });
        } else {
            setTimeout(self.updateWindow, self.window_refresh_rate_ms);
        }
    };
    this.setRefreshRate = function(refresh_rate) {
        self.window_refresh_rate_ms = refresh_rate;
    };
    var self = this;
}

var logger_display = new CREATE_LOGGER_DISPLAY();


logger_display.updateWindow();
exports.setRefreshRate = logger_display.setRefreshRate;

exports.setActiveInstruction = logger_display.setActiveInstruction;
exports.setResult = logger_display.setResult;
exports.disableWindowClear = logger_display.disableWindowClear;

// var term = require('terminal-control').init().autoClean();
// term.clearScreen();
// term.moveCursorTo(5,5);

// console.log('HERE!!');

// var supportsColor = require('supports-color');
 
// if (supportsColor) {
//     console.log('Terminal supports color', supportsColor);
// } else {
// 	console.log('No... 0');
// }
 
// if (supportsColor.has256) {
//     console.log('Terminal supports 256 colors');
// } else {
// 	console.log('No... 1');
// }
 
// if (supportsColor.has16m) {
//     console.log('Terminal supports 16 million colors (truecolor)');
// } else {
// 	console.log('No... 2');
// }

// // style a string 
// console.log(chalk.blue('Hello world!'));

// var chalkOut = [];

// // combine styled and normal strings 
// chalkOut[0] = chalk.blue('Hello') + 'World' + chalk.red('!');
 
// // compose multiple styles using the chainable API 
// chalkOut[1] = chalk.blue.bgRed.bold('Hello world!');
 
// // pass in multiple arguments 
// chalkOut[2] = chalk.blue('Hello', 'World!', 'Foo', 'bar', 'biz', 'baz');
 
// // nest styles 
// chalkOut[3] = chalk.red('Hello', chalk.underline.bgBlue('world') + '!');
 
// // nest styles of the same type even (color, underline, background) 
// chalkOut[4] = chalk.green(
//     'I am a green line ' +
//     chalk.blue.underline.bold('with a blue substring') +
//     ' that becomes green again!'
// );

// console.log('Chalk data', chalkOut);
// chalkOut.forEach(function(chalkOutLine) {
// 	console.log(chalkOutLine);
// });



// console.log('This text is displayed with an offset!');
// console.log('This text is displayed with an offset!');

// setTimeout(function(){
// 	console.log('Exiting...');
// }, 2000);