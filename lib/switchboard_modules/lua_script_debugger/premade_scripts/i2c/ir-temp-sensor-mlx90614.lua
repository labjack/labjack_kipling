--[[
    Name: ir-temp-sensor-mlx90614.lua
    Desc: This is an example that uses the MLX90614 Infrared Temperature Sensor
    Note: The sensor should be connected with SCL on EIO4 and SDA on EIO5

          I2C examples assume power is provided by a LJTick-LVDigitalIO at 3.3V
          (a DAC set to 3.3V or a DIO line could also be used for power)
--]]

-------------------------------------------------------------------------------
-- Desc: Calculate the I2C Options value. Returns a number 0-7
-------------------------------------------------------------------------------
function calc_I2C_options(startreset, startnostop, nostretching)
  local options = 0
  options = startreset*1+startnostop*2+nostretching*4
  return options
end

-------------------------------------------------------------------------------
-- Desc: Converts the raw temperature data
-------------------------------------------------------------------------------
function convert_temp(rawtemp)
  -- Convert values to temperature C.
  local convert_temp = (rawtemp[2]*256+rawtemp[1])
  -- Convert temp to °C
  convert_temp = convert_temp * 0.02
  convert_temp = convert_temp - 273.15
  -- Convert temp to °F
  -- convert_temp = (convert_temp *9/5) + 32
  return convert_temp
end

local SLAVE_ADDRESS = 0x5a

print("-------")
print("/*Connect a MLX90614 with SCL on EIO4 and SDA on EIO5*/")
print("")
-- Disable truncation warnings (truncation should not be a problem in this script)
MB.writeName("LUA_NO_WARN_TRUNCATION", 1)
-- Use EIO4 for SCL
local sclpin = 12
-- Use EIO5 for SDA
local sdapin = 13
local throttle = 65500
local options = calc_I2C_options(0,1,0)
I2C.config(sdapin, sclpin, throttle, options, SLAVE_ADDRESS)
-- Find all I2C slaves and publish results
local addrs = I2C.search(0, 127)
local addrslen = table.getn(addrs)
local found = 0
if addrslen == 0 then
  print("No I2C Slaves detected, program stopping")
  MB.writeName("LUA_RUN", 0)
end
-- Verify that the target device was found
found = 0
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
print(string.format('Num Found Addresses %d', table.getn(addrs)))
for key,val in pairs(addrs) do print(string.format('%d: 0x%x, %d (dec)',key,val,val)) end
print("")
print("-------")
print("/*Starting...*/")
print("")
local rawtemp = 0
local temp = 0
local objtemp = 0
-- Configure a 250ms interval
LJ.IntervalConfig(0, 250)

while true do
  -- If an interval is done
    if LJ.CheckInterval(0) then
      -- Read the ambient temperature of the MLX
      rawtemp = I2C.writeRead({0x06}, 3)
      temp = convert_temp(rawtemp)
      -- Read the IR temperature of the MLX
      rawtemp = I2C.writeRead({0x07}, 3)
      objtemp = convert_temp(rawtemp)
      -- Save results to USER_RAM
      MB.writeName("USER_RAM0_F32", temp)
      MB.writeName("USER_RAM1_F32", objtemp)
      print(string.format('Ambient Temperature: %.2f °C', temp))
      print(string.format('IR Temperature: %.2f °C', objtemp))
    end
end