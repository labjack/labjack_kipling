var TaskRunner = require('terminal-task-runner');
var logger = TaskRunner.logger;



var Task = TaskRunner.Base.extend({
    id: 'helloTask',
    name: 'This is only a hello world task',
    priority: 1,
    run: function(cons) {
        //Task has to be asynchronous, otherwise, you won't receive the finish/error event
        setTimeout(function() {
            logger.warn('hello, world!!');
            cons();
        });
    }
});


module.exports = Task;