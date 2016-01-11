var TaskRunner = require('terminal-task-runner');
var logger = TaskRunner.logger;



var Task = TaskRunner.Base.extend({
    id: 'helloTask',
    name: 'This is only a hello world task',
    position: 1,
    run: function(cons) {
        logger.warn('hello, world!!');
        cons();
    }
});


module.exports = Task;