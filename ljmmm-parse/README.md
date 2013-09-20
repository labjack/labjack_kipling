ljmmm-parse
===========
[LabJack Modbus Map Markup](https://bitbucket.org/labjack/ljm_constants) language parser micro-library for Node.js.  
  

Installation
--------------
``npm install ljmmm-parse``
  

Usage
---------
```javascript
var ljmmm_parse = require('ljmmm-parse');

/**
 * Logs
 * [
 *     {name: 'Test0', address: 0, type: 'UINT32'},
 *     {name: 'Test1', address: 2, type: 'UNIT32'},
 *     {name: 'Another0', address: 0, type: 'UINT32'},
 *     {name: 'Another1', address: 2, type: 'UNIT32'}
 * ]
**/
ljmmm_parse.expandLJMMMEntries(
    [
        {name: 'Test#(0:1)', address: 0, type: 'UINT32'},
        {name: 'Another#(0:1)', address: 0, type: 'UINT32'}
    ]
    function (err) { console.log(err); },
    function (expandedEntries) { console.log(expandedEntries); }
);

/**
 * Logs
 * [
 *     {name: 'Test0', address: 0, type: 'UINT32'},
 *     {name: 'Test1', address: 2, type: 'UNIT32'}
 * ]
**/
ljmmm_parse.expandLJMMMEntry(
    {name: 'Test#(0:1)', address: 0, type: 'UINT32'},
    function (err) { console.log(err); },
    function (expandedEntries) { console.log(expandedEntries); }
);

// Logs ['Test0', 'Test1', 'Test2']
ljmmm_parse.expandLJMMMName(
    'Test#(0:2)',
    function (err) { console.log(err); },
    function (expandedNames) { console.log(expandedNames); }
);

/**
 * Also available:
 * 
 * ljmmm_parse.expandLJMMMEntriesSync(listOfEntries);
 * ljmmm_parse.expandLJMMMEntrySync(entry);
**/
```


License and Copyright
-----------------------------
LabJack Corp, 2013  
Sam Pottinger, 2013

Released under the [MIT license](http://opensource.org/licenses/MIT).


Background and motivation
-----------------------------------
To standardize MODBUS map specification, LabJack developed LJMMM or LabJack Modbus Map Markup (see [ljm_constants](https://bitbucket.org/labjack/ljm_constants)). To support software targeting LabJack devices written in Node, this library supports the interpretation of LJMMM fields.


Testing
---------
Requires [rewire](https://github.com/jhnns/rewire) (npm install rewire) and [nodeunit](https://github.com/caolan/nodeunit) (npm install nodeunit).
```
nodeunit ljmmm_test.js
```


Development environment and standards
-----------------------------------------------------
This project maintains 80% code coverage at minimum and conforms to both [jsDoc](http://usejsdoc.org/) and [Google JavaScript style guidelines](http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml).
