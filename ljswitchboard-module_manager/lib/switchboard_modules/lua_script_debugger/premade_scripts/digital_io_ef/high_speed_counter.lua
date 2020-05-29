--[[
    Name: high_speed_counter.lua
    Desc: This example demonstrates how to configure and use the high speed
          counters
--]]

-- For sections of code that require precise timing assign global functions
-- locally (local definitions of globals are marginally faster)
local modbus_read=MB.R
local modbus_write=MB.W
local check_interval = LJ.CheckInterval

print("Enable the high speed counter on CIO0")
print("Please attach a jumper wire between EIO0 and CIO0")
local count = 0
local eiostate = 0
-- Enable CounterA on DIO16/CIO0
-- Disable DIO16 by writing  0 to DIO16_EF_ENABLE (necessary for configuration)
modbus_write(44032, 1, 0)
-- Write 7 to DIO16_EF_INDEX (use the high speed counter feature)
modbus_write(44132, 1, 7)
-- Re-enable DIO16
modbus_write(44032, 1, 1)
-- Set EIO0
modbus_write(2008, 0, eiostate)
-- Configure whether to read and reset or only read the count
local clearcount = true
-- Setup an interval of 500ms
LJ.IntervalConfig(0, 500)

while true do
  if eiostate==1 then
    eiostate = 0
  else
    eiostate = 1
  end
  modbus_write(2008, 0, eiostate)
  -- If an interval is done
  if check_interval(0) then
    if clearcount then
      -- Read DIO16_EF_READ_A_AND_RESET to return the current count and reset
      -- the value
      count = modbus_read(3132, 1)
    else
      -- read DIO16_EF_READ_A to return the current count
      count = modbus_read(3032, 1)
    end
    print("Current Count", count)
  end
end