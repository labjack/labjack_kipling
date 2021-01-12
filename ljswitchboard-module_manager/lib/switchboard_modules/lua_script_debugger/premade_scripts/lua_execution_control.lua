--[[
  Name: lua_execution_control.lua
  Desc: This example shows how to control LUA execution blocks using a host
        app and the USER_RAM registers.
  Note: Information on the USER_RAM registers and LJM host applications that
        work in conjunction with this example can be found here:
          https://labjack.com/support/datasheets/t-series/lua-scripting#user-ram
          
--]]

-- Use USER_RAM0_U16 (register 46180) to determine which control loop to run
local ramval = 0
local loop0 = 0
local loop1 = 1
local loop2 = 2

-- Setup an interval to control loop execution speed. Update every second
LJ.IntervalConfig(0,1000)
while true do
  if LJ.CheckInterval(0) then
    ramval = MB.readName("USER_RAM0_U16")

    if ramval == loop0 then
      print("using loop0")
    end

    if ramval == loop1 then
      print("using loop1")
    end

    if ramval == loop2 then
      print("using loop2")
    end

  end
end
