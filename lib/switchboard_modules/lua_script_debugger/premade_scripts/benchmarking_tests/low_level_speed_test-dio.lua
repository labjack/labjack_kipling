--[[
    Name: low_level_speed_test-dio.lua
    Desc: This example will output a digital waveform at at 20-25kHz on outdio
    Note: In most cases, users should throttle their code execution using the
          functions: "LJ.IntervalConfig(0, 1000)", and "if LJ.CheckInterval(0)"
--]]

-- Assign functions locally for faster processing
local modbus_read_name = MB.readName
local set_lua_throttle = LJ.setLuaThrottle
local get_lua_throttle = LJ.getLuaThrottle
local dio_direction_write = LJ.DIO_D_W
local dio_state_write = LJ.DIO_S_W
local interval_config = LJ.IntervalConfig
local check_interval = LJ.CheckInterval

print("Low-Level Benchmarking Test: toggle FIO3/DIO3 (FIO5/DIO5 on T4) as fast as possible.")
-- Change the DIO pin if using a T4 instead of a T7
local outdio = 3
local devtype = modbus_read_name("PRODUCT_NAME")
if devtype == 4 then
  outdio = 5--FIO5
end

-- Change outdio direction to output
dio_direction_write(outdio, 1)

-- The throttle setting can correspond roughly with the length of the Lua
-- script. A rule of thumb for deciding a throttle setting is
-- Throttle = (3*NumLinesCode)+20. The default throttle setting is 10 instructions
local throttle = 40
set_lua_throttle(throttle)
throttle = get_lua_throttle()
print ("Current Lua Throttle Setting: ", throttle)

-- Use an interval of 2000ms
local interval = 2000
local numwrites = 0

interval_config(0, interval)
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