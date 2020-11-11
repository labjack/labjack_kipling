# Adding New Lua Examples

1. Follow the labjack_kipling setup instructions: <https://github.com/labjack/labjack_kipling/blob/master/docs/setup.md>
2. In the labjack_kipling directory, navigate to ljswitchboard-module_manager/lib/switchboard_modules/lua_script_debugger
3. Create and test the new example with two versions: one using the Modbus names functions and one using the Modbus addresses functions.
Note: The addresses script should have the same name as the names version. We create two versions of each new script to preserve backwards compatibility with old firmware that does not include the Modbus names functions.
4. Add the Modbus names version to the appropriate directory within the premade_scripts folder.
5. Add the Modbus addresses version to the appropriate directory within the premade_scripts_addresses folder.
6. Modify moduleConstants.json to include the new examples. The names version should be included in the "preBuiltScripts" section, the addresses version should be included in the "preBuiltScriptsAddresses" section.