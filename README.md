# ljswitchboard-module_manager
A project that is dedicated to rendering, loading, and managing modules for the ljswitchboard project

## Adding Lua Script Examples to Kipling
All of the examples that Kipling ships with are located here:
https://github.com/chrisJohn404/ljswitchboard-module_manager/tree/master/lib/switchboard_modules/lua_script_debugger/premade_scripts

If a folder needs to be created for organizational purposes, then make one.

After adding the .lua file, edit this file:
https://github.com/chrisJohn404/ljswitchboard-module_manager/blob/master/lib/switchboard_modules/lua_script_debugger/moduleConstants.json
Hint, edit the variable "preBuiltScripts".  Its essentially a big array of objects that define what folders/scripts should be displayed.

## Test Changes before commiting:
Copy and replace the ljswitchboard-module_manager/lib folder to (on windows 7+):
C:\ProgramData\LabJack\K3\ljswitchboard-module_manager

Start Kipling on user's computer and make sure the example script can be loaded and that all of the scripts are still shown.  Some sort of error will likely show up if the .json file isn't valid.  If something breaks regarding the .json file, a json file linter such as this:
https://jsonlint.com/

is very useful for debugging...
