--This is an example that uses the BMP180 Barometric Pressure/Temperature/Altitude sensor on the I2C Bus on EIO4(SCL) and EIO5(SDA)
--See the datasheet (page 13-17) for calibration constant information & calculation information
--Outputs data to Registers:
--46018 = temp data
--46020 = humidity data
--46022 thru 46042 = calibration constants

fwver = MB.R(60004, 3)
if fwver < 1.0224 then
  print("This lua script requires a firmware version of 1.0224 or higher. Program Stopping")
  MB.W(6000, 1, 0)
end

function convert_16_bit(msb, lsb, conv)--Returns a number, adjusted using the conversion factor. Use 1 if not desired  
  res = 0
  if msb >= 128 then
    res = (-0x7FFF+((msb-128)*256+lsb))/conv
  else
    res = (msb*256+lsb)/conv
  end
  return res
end

I2C.config(13, 12, 65516, 0, 0x77, 0)--configure the I2C Bus

addrs = I2C.search(0, 127)
addrsLen = table.getn(addrs)
found = 0
for i=1, addrsLen do--verify that the target device was found     
  if addrs[i] == SLAVE_ADDRESS then
    print("I2C Slave Detected")
    found = 1
    break
  end
end
if found == 0 then
  print("No I2C Slave detected, program stopping")
  MB.W(6000, 1, 0)
end

--init slave
I2C.write({0xF4, 0x2E})
--verify operation
I2C.write({0xD0})
raw = I2C.read(2)
if raw[1] == 0x55 then
  print("I2C Slave Detected")
end
--get calibration data
cal = {}
for i=0xAA, 0xBF do
  if i%2 == 0 then
    I2C.write({i})
    raw = I2C.read(2)
    if i == 0xB0 or  i == 0xB2 or i == 0xB4 then
      data = raw[1]*256+raw[2]--for the 3 values that are unsigned
    else
      data = convert_16_bit(raw[1], raw[2], 1)
    end
    table.insert(cal, data)
  end
end
for i=1, 11 do
  MB.W(46022+(i-1)*2, 3, cal[i])--add data to User RAM Registers
end

LJ.IntervalConfig(0, 1000)
stage = 0 --used to control program progress
while true do
  if LJ.CheckInterval(0) then
    if stage == 0 then
      I2C.write({0xF4, 0x2E})--0x2E for temp, 0x34 for pressure
      LJ.IntervalConfig(0, 50)
      stage = 1
    elseif stage == 1 then
      rawT = {}
      I2C.write({0xF6})--MSB = F6
      rawT[1] = I2C.read(2)[1]
      I2C.write({0xF7})--LSB = F7
      rawT[2] = I2C.read(2)[1]
      UT = rawT[1]*256+rawT[2]
      MB.W(46018, 3, UT) 
      print("Temperature Data: "..UT)
      LJ.IntervalConfig(0, 50)
      stage = 2
    elseif stage == 2 then
      I2C.write({0xF4, 0x34})--0x2E for temp, 0x34 for pressure
      LJ.IntervalConfig(0, 50)
      stage = 3
    elseif stage == 3 then
      rawP = {}
      I2C.write({0xF6})--MSB = F6
      rawP[1] = I2C.read(2)[1]
      I2C.write({0xF7})--LSB = F7
      rawP[2] = I2C.read(2)[1]
      UP = rawP[1]*256+rawP[2]
      MB.W(46020, 3, UP) 
      print("Pressure Data: "..UP)
      LJ.IntervalConfig(0, 1000)
      stage = 0
    end
  end
end