--[[
    Name: low_level_speed_test-dio.lua
    Desc: This example will output a digital waveform on as fast as possible
    Note: In most cases, users should throttle their code execution using the
          functions: "LJ.IntervalConfig(0, 1000)", and "if LJ.CheckInterval(0)"

          On a T7 (FW 1.0282) this example runs at around 28kHz
          On a T4 (FW 1.0023) this example runs at around 29kHz
--]]

-- For sections of code that require precise timing assign global functions
-- locally (local definitions of globals are marginally faster)
local dio_state_write = LJ.DIO_S_W
local check_interval = LJ.CheckInterval

print("Low-Level Benchmarking Test: toggle FIO3/DIO3 (FIO5/DIO5 on T4) as fast as possible.")
-- The PRODUCT_ID register holds the device type
local devtype = MB.R(60000, 3)
-- Assume the device being used is a T7, use FIO3 pin (address = 2003)
local outpin = 3
-- If actually using a T4
if devtype == 4 then
  -- Use FIO5 pin (address = 2005)
  outpin = 5
end

-- The throttle setting can correspond roughly with the length of the Lua
-- script. A rule of thumb for deciding a throttle setting is
-- Throttle = (3*NumLinesCode)+20. The default throttle setting is 10 instructions
local throttle = 40
LJ.setLuaThrottle(throttle)
throttle = LJ.getLuaThrottle()
print ("Current Lua Throttle Setting: ", throttle)

-- Change outpin direction to output
LJ.DIO_D_W(outpin, 1)

local numwrites = 0
local interval = 2000

-- Configure an interval of 2000ms
LJ.IntervalConfig(0, interval)
-- Run the program in an infinite loop
while true do
  -- Change the state of outpin to 0
  dio_state_write(outpin, 0)
  -- Change the state of outpin to 1
  dio_state_write(outpin, 1)
  numwrites = numwrites + 1
  -- If a 2000ms interval is done
  if check_interval(0) then
    -- Convert the number of writes per interval into a frequency
    numwrites = numwrites / (interval / 1000)
    print ("Frequency in Hz: ", numwrites)
    numwrites = 0
  end
end