#!/usr/bin/env node
'use strict';

// console.log('First program');

// var shell = require('shelljs');
// shell.echo('hello world');

// var Log = require('log');
// var path = require('path');
// var fs = require('fs');

// var filePath = path.join(process.cwd(), 'file.log');
// shell.echo('Creating Log File', filePath);

// // Create the log file
// fs.writeFileSync(filePath, '');

// var stream = fs.createReadStream(filePath, {'flag': 'w'});
// var log = new Log('debug', stream);

// log.on('line', function(line){
//   console.log(line);
// });

// var program = require('commander');

// var cmdValue;
// var envValue;

// program
//     .version('0.0.1')
//     .option('-p, --peppers', 'Add peppers')
//     .option('-P, --pineapple', 'Add pineapple')
//     .option('-b, --bbq-sauce', 'Add bbq sauce')
//     .option('-c, --cheese [type]', 'Add the specified type of cheese [marble]', 'marble')
//     .parse(process.argv)
//     .action(function(cmd, env) {
//         cmdValue = cmd;
//         envValue = env;
//         console.log('in ACTION', cmd, env);
//     });

// console.log('you ordered a pizza with:');
// if (program.peppers) console.log('  - peppers');
// if (program.pineapple) console.log('  - pineapple');
// if (program.bbqSauce) console.log('  - bbq');
// console.log('  - %s cheese', program.cheese);

// var app = new AppInitialize(program);

// function AppInitialize(prog) {
//     var appOpts = {
//         peppers: prog.peppers,
//         pineapple: prog.pineapple,
//         bbqSauce: prog.bbqSauce,
//     };

//     shell.echo('Initialized App');    

//     // Start the application.
//     // require('./main.js').AppInitialize(appOpts);
// }


var path = require('path');
var TaskRunner = require('terminal-task-runner');
var pkg = require('../package');
var taskList = require('./taskList');


TaskRunner.createMenu({
    title: 'This is Header',
    subtitle: 'here is subTitle',
    helpTxt: 'Help Me!',
    taskDir: path.resolve(__dirname, 'tasks'),
    taskList: taskList,
    helpFile: path.resolve(__dirname, 'help.txt'),
    version: pkg.version,
    preferenceName: '.runner'
});

// var cli = require('cli');
// cli.parse({
//     file: [ 'f', 'A file to process', 'file', 'temp.log' ],          // -f, --file FILE   A file to process 
//     time: [ 't', 'An access time', 'time', false],                 // -t, --time TIME   An access time 
//     work: [ false, 'What kind of work to do', 'string', 'sleep' ]  //     --work STRING What kind of work to do 
// });
// cli.main(function(args, options) {
//     console.log('HERE!!', args, options);
//     // var server, middleware = [];

//     // if(options.log) {
//     //     this.debug('Enable lodding');
//     //     middleware.push(require('log')());
//     // }

//     // this.debug('Serving files from ' + options.serve);
//     // middleware.push(require('static')('/', options.serve, 'index.html'));

//     // server = this.createServer(middleware).listen(options.port);

//     // this.ok('Listening on port ' + options.port);
//     process.stdin.setEncoding('utf8');
//     process.stdin.on('readable', function() {
//         var chunk = process.stdin.read();
//         if(chunk !== null) {
//             console.log('We got data', chunk);
//         }
//     });
//     process.stdin.on('end', function() {
//         process.stdout.write('end');
//     });
// });
// // cli.withStdin(function() {
// //     console.log('in withStdin');
// // });        //callback receives stdin as a string 
// // cli.withStdinLines(function() {
// //     console.log('in withStdin');
// // });   //callback receives stdin split into an array of lines (lines, newline) 
// cli.withInput(process.stdin, function (line, newline, eof) {
//     console.log('in cli.withInput');
// });
// var i = 0, interval = setInterval(function () { 
//     cli.progress(++i / 100); 
//     if (i === 100) {
//         clearInterval(interval);
//         cli.ok('Finished!');
//     }
// }, 50);

// var cli = require('cli');

// cli.spinner('Working..');

// setTimeout(function () {
//     cli.spinner('Working.. done!', true); //End the spinner
// }, 3000);
