--***Depreciated***
--This is an example to help get users started with the Lua LabJack I2C Library
--The calc_I2C_options function allows for easily readable and easily changed
--vals for the register I2C_OPTIONS - Address: 5103 (See modbus map for more)
--
--The search function lists all I2C devices on the configured bus, which
--is very helpful for debugging hardware issues
--See this for more: https://labjack.com/support/datasheets/t7/scripting/I2C-Library
print("-------")
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
--default is SDA:EIO5, SCL:EIO4
sdaPin = 13--FIO0:7 = 0:7, EIO0:7 = 8:15, CIO0:7 = 16:23
sclPin = 12--These are DIO Nums, corresponding to FIO/EIO/CIO/MIO nums
if (sclPin <= 7 or sdaPin <= 7) then
  print("Please note you are using FIO pins, which are not reccommended for I2C usage (Program will still run)")
end
throttleVal = 0 --0=fastest; 65535=fastest; 65534, 65533, etc. gets slower.
i2cOptions = calc_I2C_options(0,1,0)--Calculate the I2C Options value
myAddr = 0x19--I2C address of the slave device
I2C.config(sdaPin, sclPin, throttleVal, i2cOptions, myAddr)
print(string.format("SDA: DIO%d     SCL: DIO%d    throttleVal: %d    optionsVal: %d", sdaPin, sclPin, throttleVal, i2cOptions))

addrs = I2C.search(0, 127)--find all I2C slaves and publish results
addrsLen = table.getn(addrs)
found = 0
if addrsLen == 0 then
  print("No I2C Slaves detected, program stopping")
  print("Are you using pull-up resistors? Pull up resistors are required for all I2C buses")
  MB.W(6000, 1, 0)--end script
end

--Print out the found I2C slave devices.
print(string.format('Num Found Addresses %d', table.getn(addrs)))
for key,val in pairs(addrs) do print(string.format('%d: 0x%x, %d (dec)',key,val,val)) end

--Stop the Lua Script
print("--------")
MB.W(6000, 1, 0)