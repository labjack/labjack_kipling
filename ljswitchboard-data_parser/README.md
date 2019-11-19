# ljswitchboard-data_parser
A  library that contains a variety of formatters for data coming and going to LabJack devices.

This library parses modbus data read from a T-Series device.

General Instructions

Installation
`npm install ljswitchboard-data_parser`

Init
`const ljdp = require('ljswitchboard-data_parser');`

Calling
 `// Parse Result
let rawVal = 1.02
// 
let parsedVal = ljdp.parseResult(rawVal);
`

