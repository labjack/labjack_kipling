--[[
    Name: low_level_speed_test-dio.lua
    Desc: This example will output a digital waveform on as fast as possible
    Note: In most cases, users should throttle their code execution using the
          functions: "LJ.IntervalConfig(0, 1000)", and "if LJ.CheckInterval(0)"
--]]

-- For sections of code that require precise timing assign global functions
-- locally (local definitions of globals are marginally faster)
local dio_state_write = LJ.DIO_S_W
local check_interval = LJ.CheckInterval

print("Low-Level Benchmarking Test: toggle FIO3/DIO3 (FIO5/DIO5 on T4) as fast as possible.")
-- The throttle setting can correspond roughly with the length of the Lua
-- script. A rule of thumb for deciding a throttle setting is
-- Throttle = (3*NumLinesCode)+20. The default throttle setting is 10 instructions
local throttle = 40
LJ.setLuaThrottle(throttle)
throttle = LJ.getLuaThrottle()
print ("Current Lua Throttle Setting: ", throttle)

-- The PRODUCT_ID register holds the device type
local devtype = MB.readName("PRODUCT_ID")
-- Assume the device being used is a T7, use FIO3 pin (address = 2003)
local outpin = 2003
-- If actually using a T4
if devtype == 4 then
  -- Use FIO5 pin (address = 2005)
  outpin = 2005
end

-- Change outdio direction to output
LJ.DIO_D_W(outdio, 1)

-- Use an interval of 2000ms
local interval = 2000
local numwrites = 0

LJ.IntervalConfig(0, interval)
while true do
  -- Change the state of outdio to 0
  dio_state_write(outdio, 0)
  -- Change the state of outdio to 1
  dio_state_write(outdio, 1)
  numwrites = numwrites + 1
  -- If the 2000ms interval is done
  if check_interval(0) then
    -- Convert the number of writes per interval into a frequency
    numwrites = numwrites / (interval / 1000)
    print ("Frequency in Hz: ", numwrites)
    numwrites = 0
  end
end