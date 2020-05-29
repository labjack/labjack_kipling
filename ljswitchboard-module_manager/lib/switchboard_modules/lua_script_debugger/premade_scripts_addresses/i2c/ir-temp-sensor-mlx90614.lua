--This is an example that uses the MLX90614 Infrared Temperature Sensor.
--The sensor should be connected with SCL on EIO7 and SDA on EIO6.  

print("-------")
print("/*Connect a MLX90614 with SCL on EIO7 and SDA on EIO6*/")
print("")

fwver = MB.R(60004, 3)
devType = MB.R(60000, 3)
if (fwver < 1.0224 and devType == 7) or (fwver < 0.2037 and devType == 4) then
  print("This lua script requires a higher firmware version (T7 Requires 1.0224 or higher, T4 requires 0.2037 or higher). Program Stopping")
  MB.W(6000, 1, 0)
end

function calc_I2C_options(resetAtStart, noStopAtStarting, disableStretching)--Returns a number 0-7
  local optionsVal = 0
  optionsVal = resetAtStart*1+noStopAtStarting*2+disableStretching*4
  return optionsVal
end

--Configure the I2C Utility
local sdaPin = 14 -- EIO6
local sclPin = 15 -- EIO7
local throttleVal = 65500--65523
local i2cOptions = calc_I2C_options(0,1,0)--Calculate the I2C Options value
local myAddr = 0x5a--I2C address of the slave device
I2C.config(sdaPin, sclPin, throttleVal, i2cOptions, myAddr)


------------ START SCAN FOR I2C SLAVE DEVICES ---------------------
local addrs = I2C.search(0, 127)--find all I2C slaves and publish results
local addrsLen = table.getn(addrs)
local found = 0
if addrsLen == 0 then
  print("No I2C Slaves detected, program stopping")
  MB.W(6000, 1, 0)--end script
end

-- verify that the target device was found
found = 0
for i=1, addrsLen do
  if addrs[i] == myAddr then
    print("I2C Slave Detected")
    found = 1
    break
  end
end
if found == 0 then
  print("No I2C Slave detected, program stopping")
  MB.W(6000, 1, 0)
end

print(string.format('Num Found Addresses %d', table.getn(addrs)))
for key,val in pairs(addrs) do print(string.format('%d: 0x%x, %d (dec)',key,val,val)) end
------------ END SCAN FOR I2C SLAVE DEVICES ---------------------
print("")
print("-------")
print("/*Starting...*/")
print("")

function convTemp(rawTemp)
  -- Convert values to temperature C.
  local convTemp = (rawTemp[2]*256+rawTemp[1])
  convTemp = convTemp * 0.02
  convTemp = convTemp - 273.15 -- Convert temp to °C
  -- convTemp = (convTemp *9/5) + 32 -- Convert temp to °F
  return convTemp
end

local rawTemp = 0
local ambientTemp = 0
local objTemp = 0

LJ.IntervalConfig(0, 250)
while true do
    if LJ.CheckInterval(0) then
      -- Read the ambient temperature of the MLX
      rawTemp = I2C.writeRead({0x06}, 3)
      ambientTemp = convTemp(rawTemp)

      -- Read the IR temperature of the MLX
      rawTemp = I2C.writeRead({0x07}, 3)
      objTemp = convTemp(rawTemp)

      -- Save results to USER_RAM0_F32 USER_RAM1_F32 
      MB.W(46000, 3, ambientTemp)
      MB.W(46002, 3, objTemp)

      print(string.format('Ambient Temperature: %.2f °C', ambientTemp))
      print(string.format('IR Temperature: %.2f °C', objTemp))
    end
end

--Stop the Lua Script
MB.W(6000, 1, 0)