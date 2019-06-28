# ljswitchboard-module_manager
A project that is dedicated to rendering, loading, and managing modules for the ljswitchboard project

## Adding Lua Script Examples to Kipling
All of the examples that Kipling ships with are located in the [lib/switchboard_modules/lua_script_debugger/premade_scripts](https://github.com/chrisJohn404/ljswitchboard-module_manager/tree/master/lib/switchboard_modules/lua_script_debugger/premade_scripts) folder.  

Simply:
1. Add a .lua file to the repo 
2. Edit the [moduleConstants.json](https://github.com/chrisJohn404/ljswitchboard-module_manager/blob/master/lib/switchboard_modules/lua_script_debugger/moduleConstants.json) file (under the "preBuiltScripts") key to have the file listed in the drop-down menu in [Kipling](https://labjack.com/support/software/applications/t-series/kipling/lua-scripting).

## Organizing Lua Script Examples

The file system organization of lua scripts was kept intentionally decoupled from what gets displayed to users in the drop-down menu for re-naming flexibility purposes.  Add/organize the .lua script file that needs to be added to the .git repo.  Then edit the "preBuiltScripts" key/variable (which is essentially a big array of objects...).

Chris 5/28: I believe the code looks for the "subScripts" and the "location" keys to determine if an entry is a file or a sub-directory/tree-entry.  

##### Adding a new file to the list
```
"preBuiltScripts":[{
  "name":"Test Script",
  "location": "...xxx..."
}]
```

 ##### Adding a new tree item to the list with a file listed under it
 ```
"preBuiltScripts":[{
  "name":"Test Script",
  "subScripts":[{
    "name":"Test Script",
    "location": "...xxx..."
  }],
}]
```


## Test Changes before commiting:
Copy and replace the ljswitchboard-module_manager/lib folder to (on windows 7+):
C:\ProgramData\LabJack\K3\ljswitchboard-module_manager

Start Kipling on user's computer and make sure the example script can be loaded and that all of the scripts are still shown.  Some sort of error will likely show up if the .json file isn't valid.  If something breaks regarding the .json file, a json file linter such as this:
https://jsonlint.com/

is very useful for debugging...

*Notes: follows .json syntax.... The examples list is cached on first-program-load.  Try copying/pasting a line-item that already exists & re-start K3.  Re-loading just the module will only work if you are in "dev" mode.  I forget what happens if the .json file isn't formatted correctly but your computer will most likely not emit blue smoke, no promises :)*
