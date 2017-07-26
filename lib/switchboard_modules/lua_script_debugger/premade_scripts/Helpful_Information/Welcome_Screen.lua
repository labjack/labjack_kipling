--Welcome to LabJack Lua Scripting!
--See any of the examples to get started!
print("Welcome, please Load an example to get started!")

--Overview----------------------------------------------------------------

--The T7 has an internal Lua v5.1 interpreter and compiler which are
--used to build and execute small Lua scripts.  This section
--of Kipling is dedicated to transferring the script files to the
--T7, and then reading the interpreted output in the console.  Because 
--scripts are sent as plain text to the T7, compiler errors are handled by
--the T7, not the Kipling IDE.  LabJack recommends firmware 1.0134 or newer.
--Old firmware is not good at handling Lua syntax and compiler errors.


--Helpful tips-------------------------------------------------------------

--"if" statements should be followed by "then"
--"while" and "if" statements require an "end" after the code block
--We recommend limiting script length to ~300 lines or less
--Some functions of Lua are not available (to reduce stack size)
--See "LabJack Lua functions" code example for a list of integrated functions
--Functions are limited to those in eLua core (embedded Lua)

--Register Matrix(Modbus Map) http://labjack.com/support/modbus/map
--Scripting information       http://labjack.com/support/datasheets/t7/scripting


--Other Comments-----------------------------------------------------------

--We ask that if you are having problems please contact us
--Send questions and feedback to support@labjack.com

print("Exiting Lua Script")
MB.W(6000, 1, 0)