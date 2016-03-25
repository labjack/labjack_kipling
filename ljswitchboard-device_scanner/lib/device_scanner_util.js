/**
 * Functions and constants to be shared amongst the device scanners.
 */

/**
 * Returns true if the given device connection is represented in the given
 *     connections, returns false if not. Expects resolved connectionTypes
 *     only (USB, ETHERNET, or WIFI).
 */
exports.doConnectionsIncludeConnection = function(connections, connection) {
    var included = false;
    connections.some(function(known) {
        if (
            known.serialNumber === connection.serialNumber &&
            known.connectionType === connection.connectionType
        ) {
            included = true;
            return true;
        }
        return false;
    });
    return included;
};
