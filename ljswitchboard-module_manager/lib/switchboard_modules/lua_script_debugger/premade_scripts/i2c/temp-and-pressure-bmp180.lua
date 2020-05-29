--[[
    Name: temp-and-pressure-bmp180.lua
    Desc: This is an example that uses the BMP180 Barometric Pressure/
          Temperature / Altitude sensor on the I2C Bus on EIO4(SCL) and EIO5(SDA)
    Note: See the datasheet (page 13-17) for calibration constant information
          and calculation information:
            https://cdn-shop.adafruit.com/datasheets/BST-BMP180-DS000-09.pdf
--]]

--Outputs data to Registers:
--46018 = temp data
--46020 = humidity data
--46022 - 46042 = calibration constants

-------------------------------------------------------------------------------
--  Desc: Returns a number adjusted using the conversion factor
--        Use 1 if not desired
-------------------------------------------------------------------------------
local function convert_16_bit(msb, lsb, conv)
  res = 0
  if msb >= 128 then
    res = (-0x7FFF+((msb-128)*256+lsb))/conv
  else
    res = (msb*256+lsb)/conv
  end
  return res
end

local SLAVE_ADDRESS = 0x77

-- Configure the I2C Bus
I2C.config(13, 12, 65516, 0, SLAVE_ADDRESS, 0)
local addrs = I2C.search(0, 127)
local addrslen = table.getn(addrs)
local found = 0
-- Verify that the target device was found
for i=1, addrslen do
  if addrs[i] == SLAVE_ADDRESS then
    print("I2C Slave Detected")
    found = 1
    break
  end
end
if found == 0 then
  print("No I2C Slave detected, program stopping")
  MB.writeName("LUA_RUN", 0)
end
-- Initialize the slave
I2C.write({0xF4, 0x2E})
-- Verify operation
I2C.write({0xD0})
local raw = I2C.read(2)
-- Get calibration data
local cal = {}
for i=0xAA, 0xBF do
  if i%2 == 0 then
    I2C.write({i})
    raw = I2C.read(2)
    if i == 0xB0 or  i == 0xB2 or i == 0xB4 then
      -- For the 3 values that are unsigned
      data = raw[1]*256+raw[2]
    else
      data = convert_16_bit(raw[1], raw[2], 1)
    end
    table.insert(cal, data)
  end
end
for i=1, 11 do
  -- Add data to User RAM Registers
  MB.W(46022+(i-1)*2, 3, cal[i])
end
-- Configure a 1000ms interval
LJ.IntervalConfig(0, 1000)
-- Variable used to control program progress
local stage = 0

while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    if stage == 0 then
      -- 0x2E is the code for temperature reading
      I2C.write({0xF4, 0x2E})
      -- Set a 50ms interval to give the sensor time to process
      LJ.IntervalConfig(0, 50)
      stage = 1
    elseif stage == 1 then
      rawtemp = {}
      -- MSB = F6
      I2C.write({0xF6})
      rawtemp[1] = I2C.read(2)[1]
      -- LSB = F7
      I2C.write({0xF7})
      rawtemp[2] = I2C.read(2)[1]
      temp = rawtemp[1]*256+rawtemp[2]
      MB.writeName("USER_RAM9_F32", temp)
      print("Temperature Data: "..temp)
      -- Set a 50ms interval
      LJ.IntervalConfig(0, 50)
      stage = 2
    elseif stage == 2 then
      -- 0x34 is the code for pressure reading
      I2C.write({0xF4, 0x34})
      LJ.IntervalConfig(0, 50)
      stage = 3
    elseif stage == 3 then
      rawpressure = {}
      I2C.write({0xF6})
      rawpressure[1] = I2C.read(2)[1]
      I2C.write({0xF7})
      rawpressure[2] = I2C.read(2)[1]
      pressure = rawpressure[1]*256+rawpressure[2]
      MB.writeName("USER_RAM10_F32", pressure)
      print("Pressure Data: "..pressure)
      -- Set the original 1000ms interval
      LJ.IntervalConfig(0, 1000)
      stage = 0
    end
  end
end