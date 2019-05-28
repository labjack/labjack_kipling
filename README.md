# ljswitchboard-module_manager
A project that is dedicated to rendering, loading, and managing modules for the ljswitchboard project

## Adding Lua Script Examples to Kipling
All of the examples that Kipling ships with are located in the [lib/switchboard_modules/lua_script_debugger/premade_scripts](https://github.com/chrisJohn404/ljswitchboard-module_manager/tree/master/lib/switchboard_modules/lua_script_debugger/premade_scripts) folder.  

Simply add a .lua file to the repo and then edit the [moduleConstants.json](https://github.com/chrisJohn404/ljswitchboard-module_manager/blob/master/lib/switchboard_modules/lua_script_debugger/moduleConstants.json) file (under the "preBuiltScripts") key to have the file listed in the drop-down menu in [Kipling](https://labjack.com/support/software/applications/t-series/kipling/lua-scripting).

## Organizing Lua Script Examples

The file system organization of lua scripts was kept intentionally decoupled from what gets displayed to users in the drop-down menu for re-naming flexibility purposes.  Add/organize the .lua script file that needs to be added to the .git repo.  Then edit the "preBuiltScripts" key/variable (which is essentially a big array of objects...).

Chris 5/28: I believe the code looks for the "subScripts" and the "location" keys to determine if an entry is a file or a sub-directory/tree-entry.  
```
"preBuiltScripts":[{
  "name":"Test Script",
  "location": "...xxx..."
}]
```
 - This will display the entry as a file.
 
 ```
"preBuiltScripts":[{
  "name":"Test Script",
  "subScripts":[{
    "name":"Test Script",
    "location": "...xxx..."
  }],
}]
```
 - This will make a tree item with a "test Script" under it.

## Test Changes before commiting:
Copy and replace the ljswitchboard-module_manager/lib folder to (on windows 7+):
C:\ProgramData\LabJack\K3\ljswitchboard-module_manager

Start Kipling on user's computer and make sure the example script can be loaded and that all of the scripts are still shown.  Some sort of error will likely show up if the .json file isn't valid.  If something breaks regarding the .json file, a json file linter such as this:
https://jsonlint.com/

is very useful for debugging...
