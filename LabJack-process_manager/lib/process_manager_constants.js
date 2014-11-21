/**
 * Internal message types that have special to the process_manager and the 
 * slave_process.
**/


/**
 * ------------- sendReceive Message Types -------------------------------------
 */
// Type of messageType to use for generic sendReceive messages
exports.message = 'message';

// internal sendReceive message types
exports.stopChildProcess = 'stopProcess';
exports.getProcessInfo = 'getProcessInfo';


/**
 * ------------- child-emitted (via emit('message') Message Types --------------
 */
// internal child-emitted messages (send only)
exports.childProcessStarted = 'childProcessStarted';
exports.emitMessage = 'emit';


/**
 * ------------- master-emitted (via emit('message') Message Types -------------
 */