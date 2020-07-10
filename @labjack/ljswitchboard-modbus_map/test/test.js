

var TEST_MODBUS_PARSER = true;


if(TEST_MODBUS_PARSER) {
  var modbus_parser_test = require('./modbus_parser_test');
  exports.modbus_parser_test = modbus_parser_test.tests;
}
