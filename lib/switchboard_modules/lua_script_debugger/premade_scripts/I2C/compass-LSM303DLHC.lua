--This is an example that uses the LSM303DLHC Accelerometer & Magnetometer on the I2C Bus on EIO4(SCL) and EIO5(SDA)
--Outputs data to Registers:
--X mag = 46000
--Y mag = 46002
--Z mag = 46004

fwver = MB.R(60004, 3)
devType = MB.R(60000, 3)
if (fwver < 1.0224 and devType == 7) or (fwver < 0.2037 and devType == 4) then
  print("This lua script requires a higher firmware version (T7 Requires 1.0224 or higher, T4 requires 0.2037 or higher). Program Stopping")
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

SLAVE_ADDRESS = 0x1E
I2C.config(13, 12, 65516, 0, SLAVE_ADDRESS, 0)--configure the I2C Bus

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
I2C.write({0x00, 0x14})--Data Output Rate set (30Hz), disable temp sensor
I2C.write({0x01, 0x20})--Amplifier Gain set (+/-1.3 Gauss)
I2C.write({0x02, 0x00})-- set mode (continous conversion)

LJ.IntervalConfig(0, 500)
while true do
  if LJ.CheckInterval(0) then

    dataRaw = {}
    for i=0, 5 do
      I2C.write({0x03+i})--sequentially read the addresses containing the magnetic field data
      dataIn = I2C.read(2)  
      table.insert(dataRaw, dataIn[1])
    end
    data = {}
    table.insert(data, convert_16_bit(dataRaw[1], dataRaw[2], 1100))--convert the data into useful gauss values
    table.insert(data, convert_16_bit(dataRaw[3], dataRaw[4], 11000))
    table.insert(data, convert_16_bit(dataRaw[5], dataRaw[6], 980))
    MB.W(46000, 3, data[1])--add X value, in Gauss, to the user_ram registers
    MB.W(46002, 3, data[2])--add Y
    MB.W(46004, 3, data[3])--add Z
    print("X: "..data[1])
    print("Y: "..data[2])
    print("Z: "..data[3])
    print("------")
  end
end