// main.js
// Manage multiple git submodules; e.g. run a command in each submodule.

"use strict";

var SMC = require('./scripts/lib/submodule_commander.js');

exports.parse = parse;
function parse(cli) {
    processCli(require('yargs')(cli));
}

var processCli = function(yargs) {
    return yargs
        .options({
            'w': {
                'alias': 'which',
                'choices': ['all', 'core'],
                'default': 'all',
                'describe': 'Which named group of submodules to operate on. If defined multiple times, the final definition is used.',
                'global': true,
                'nargs': 1,
            },
            'hidden_debug': {
                'hidden': true,
                'type': 'boolean',
            },
        })
        .command('list', 'List submodules', {}, (argv) => {
            if (argv.which === 'all') {
                console.log(SMC.getAllSubmodules());
            }
            else {
                console.log(SMC.getCoreSubmodules());
            }
        })
        .command('do',
            'Perform a command for the selected submodules (select submodules with --which). Precede your command with -c. See `node index.js do --help`',
            (argv) => {
                return argv.options({
                    'c': {
                        'alias': 'command',
                        'demandOption': true,
                        'describe': 'The shell command to execute. Wrap with quotes or escape whitespace.',
                        'type': 'string',
                    },
                    'd': {
                        'alias': 'dir_out',
                        'default': true,
                        'describe': 'Output the directory before each command is executed',
                        'type': 'boolean',
                    },
                    'o': {
                        'alias': 'command_out',
                        'default': true,
                        'describe': 'Output the output of each command',
                        'type': 'boolean',
                    },
                    'i': {
                        'alias': 'ignore',
                        'describe': 'Do not output --command_out output if --command_out output matches this regex.',
                        'type': 'string',
                    },
                    'ignore_message': {
                        'describe': 'Unless --quiet: if output was `--ignore`d, outputs "COUNT submodules of TOTOAL_NUMBER were IGNORE_MESSAGE"',
                        'default': 'ignored',
                        'type': 'string',
                    },
                    's': {
                        'alias': 'summary_out',
                        'default': true,
                        'describe': 'Output a summary of success/failure',
                        'type': 'boolean',
                    },
                    'q': {
                        'alias': 'quiet',
                        'default': false,
                        'describe': 'Output nothing but errors. Overrides --summary_out, --dir_out, --command_out, --ignore_message',
                        'type': 'boolean',
                    },
                });
            }, (argv) => {
            var smc = new SMC.SubmoduleCommander(argv);
            smc.commandSubmodules();
        })
        .demandCommand(1)
        .strict(true)
        .help('h')
        .alias('h', 'help')
        .argv;
};

var res = processCli(require('yargs'));
