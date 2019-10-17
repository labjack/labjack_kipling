--[[
    Name: 37_counters.lua
    Desc: This program demonstrates how to use AINs as counters.
    Note: In most cases, users should throttle their code execution using the
          functions: "LJ.IntervalConfig(0, 1000)", and "if LJ.CheckInterval(0)"
--]]

--Array indexes 1-14 correspond with AIN0-13
--Array indexes 15-37 correspond with DIO0-22 as the following:
  --Index:  15            Channel:  FIO0  (DIO0)
  --Index:  16            Channel:  FIO1  (DIO1)
  --Index:  17            Channel:  FIO2  (DIO2)
  --Index:  18            Channel:  FIO3  (DIO3)
  --Index:  19            Channel:  FIO4  (DIO4)
  --Index:  20            Channel:  FIO5  (DIO5)
  --Index:  21            Channel:  FIO6  (DIO6)
  --Index:  22            Channel:  FIO7  (DIO7)
  --Index:  23            Channel:  EIO0  (DIO8)
  --Index:  24            Channel:  EIO1  (DIO9)
  --Index:  25            Channel:  EIO2  (DIO10)
  --Index:  26            Channel:  EIO3  (DIO11)
  --Index:  27            Channel:  EIO4  (DIO12)
  --Index:  28            Channel:  EIO5  (DIO13)
  --Index:  29            Channel:  EIO6  (DIO14)
  --Index:  30            Channel:  EIO7  (DIO15)
  --Index:  31            Channel:  CIO0  (DIO16)
  --Index:  32            Channel:  CIO1  (DIO17)
  --Index:  33            Channel:  CIO2  (DIO18)
  --Index:  34            Channel:  CIO3  (DIO19)
  --Index:  35            Channel:  MIO0  (DIO20)
  --Index:  36            Channel:  MIO1  (DIO21)
  --Index:  37            Channel:  MIO2  (DIO22)

-- For sections of code that require precise timing assign global functions
-- locally (local definitions of globals are marginally faster)
local modbus_read=MB.R
local modbus_write=MB.W

print("Create and read 37 counters.")
-- Read the PRODUCT_ID register to get the device type. This script will not
-- run correctly on devices other than the T7
if (modbus_read(60000, 3) ~= 7) then
  print("This example is only for the T7. Exiting Lua Script.")
  -- Write a 0 to LUA_RUN to stop the script if not using a T7
  modbus_write(6000, 1, 0)
end

-- AIN thresholds for binary conversion
local threshold = {}
threshold[1] = 2.8
threshold[2] = 2.8
threshold[3] = 2.8
threshold[4] = 2.8
threshold[5] = 1.5
threshold[6] = 1.5
threshold[7] = 1.5
threshold[8] = 1.5
threshold[9] = 1.5
threshold[10] = 1.5
threshold[11] = 4.1
threshold[12] = 4.1
threshold[13] = 4.1
threshold[14] = 4.1

-- 1 = Rising edge, 0 = falling
local edge = {}
for i = 1, 37 do
  edge[i] = 0 --sets all 37 counters to increment on falling edges
end

local bits = {}
local newbits = {}
local count = {}

-- The throttle setting can correspond roughly with the length of the Lua
-- script. A rule of thumb for deciding a throttle setting is
-- Throttle = (3*NumLinesCode)+20. The default throttle setting is 10 instructions
local throttle = 100
LJ.setLuaThrottle(throttle)
throttle = LJ.getLuaThrottle()
print ("Current Lua Throttle Setting: ", throttle)

-- Set FIO registers to input
modbus_write(2600, 0, 0)
-- Set EIO registers to input
modbus_write(2601, 0, 0)
-- Set COI registers to input
modbus_write(2602, 0, 0)
-- Set MIO registers to input
modbus_write(2603, 0, 0)
-- Set AIN_ALL_RESOLUTION_INDEX to 1 (fastest setting)
modbus_write(43903, 0, 1)

for i=1, 37 do
  bits[i] = 0
  newbits[i] = 99
  count[i] = 0
end

while true do
  --Analog channels AIN0-13
  for i=1, 14 do
    -- If the channels value is above the threshold
    if modbus_read((i-1)*2, 3) > threshold[i] then
      newbits[i]=1
    else
      newbits[i]=0
    end
  end
  --Digital channels DIO0-22
  for i=15, 37 do
    newbits[i] = modbus_read((i-15)+2000, 0)
  end

  --Compare newbits to bits for each counter
  for i=1, 37 do
    -- If bits[i] is different from newbits[i] the counter state changed
    if bits[i] ~= newbits[i] then
      -- If the counter should increase on a rising edge
      if edge[i] == 1 then
        -- If the last counter state was 0 then there was a rising edge, increment
        -- the counter
        if bits[i] == 0 then
          count[i] = count[i] + 1
          print ("Counter: ", i-1, " Rising: ", count[i])
        end
      -- If the counter should increase on a falling edge
      else
        -- If the last counter state was 1 then there was a falling edge,
        -- increment the counter
        if bits[i] == 1 then
          count[i] = count[i] + 1
          print ("Counter: ", i-1, " Falling: ", count[i])
        end
      end
      -- Adjust bits to reflect the new counter state
      bits[i] = newbits[i]
      -- Write the counter values to USER_RAM
      modbus_write(((i-1)*2)+46000, 3, count[i])
    end
  end
end
