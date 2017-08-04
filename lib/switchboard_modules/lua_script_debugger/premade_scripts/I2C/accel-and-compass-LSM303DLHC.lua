--This is an example that uses the LSM303DLHC Accelerometer & Magnetometer on the I2C Bus on EIO4(SCL) and EIO5(SDA)
--This example is a combination of the LSM303 Accelerometer and LSM303 Magentometer Lua scripts
--Outputs data to Registers:
--X mag = 46000
--Y mag = 46002
--Z mag = 46004
--X accel = 46006
--Y accel = 46008
--Z accel = 46010

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

magAddr = 0x1E
I2C.config(13, 12, 65516, 0, magAddr, 0)--configure the I2C Bus
accelAddr = 0x19
I2C.config(13, 12, 65516, 0, accelAddr, 0)--configure the I2C Bus

addrs = I2C.search(0, 127)
addrsLen = table.getn(addrs)
found = 0
for i=1, addrsLen do--verify that the target device was found     
  if addrs[i] == magAddr then
    print("I2C Magnetometer Slave Detected")
    found = found+1
  end
  if addrs[i] == accelAddr then
    print("I2C Accelerometer Slave Detected")
    found = found+1
  end
end
if found ~= 2 then
  print(string.format("%d", found).." slave devices found (looking for 2 devices), program stopping")
  MB.W(6000, 1, 0)
end

--init mag slave
MB.W(5104, 0, magAddr)--change target to accelerometer
I2C.write({0x00, 0x14})--Data Output Rate set (30Hz), disable temp sensor
I2C.write({0x01, 0x20})--Amplifier Gain set (+/-1.3 Gauss)
I2C.write({0x02, 0x00})-- set mode (continous conversion)

--init accel slave
MB.W(5104, 0, accelAddr)--change target to accelerometer
I2C.write({0x20, 0x27})--Data Rate: 10Hz, disable low-power, enable all axes
I2C.write({0x23, 0x49})--continuous update, LSB at lower addr, +/- 2g, Hi-Res disable

LJ.IntervalConfig(0, 500)
while true do
  if LJ.CheckInterval(0) then
    --begin Magnetometer data read--
    MB.W(5104, 0, magAddr)--change target to magnetometer
    dataMagRaw = {}
    for i=0, 5 do
      I2C.write({0x03+i})--sequentially read the addresses containing the magnetic field data
      dataIn = I2C.read(2)  
      table.insert(dataMagRaw, dataIn[1])
    end
    dataMag = {}
    table.insert(dataMag, convert_16_bit(dataMagRaw[1], dataMagRaw[2], 1100))--convert the data into useful gauss values
    table.insert(dataMag, convert_16_bit(dataMagRaw[3], dataMagRaw[4], 11000))
    table.insert(dataMag, convert_16_bit(dataMagRaw[5], dataMagRaw[6], 980))
    
    --begin Accelerometer data read--
    MB.W(5104, 0, accelAddr)--change target to accelerometer
    dataAccelRaw = {}
    for i=0, 5 do --sequentially read the addresses containing the accel data
      I2C.write({0x28+i})
      dataAccelIn = I2C.read(2)
      table.insert(dataAccelRaw, dataAccelIn[1])
    end
    dataAccel = {}
    for i=0, 2 do--convert the data into G's
      table.insert(dataAccel, convert_16_bit(dataAccelRaw[1+i*2], dataAccelRaw[2+i*2], (0x7FFF/2)))
      MB.W(46006+i*2, 3, dataAccel[i+1])
    end
    
    --Report results to print() and User RAM--
    MB.W(46000, 3, dataMag[1])--add magX value, in Gauss, to the user_ram registers
    MB.W(46002, 3, dataMag[2])--add magY
    MB.W(46004, 3, dataMag[3])--add magZ
    MB.W(46006, 3, dataAccel[1])--add accelX value, in G's, to the user_ram register
    MB.W(46008, 3, dataAccel[2])--add accelY
    MB.W(46010, 3, dataAccel[3])--add accelZ
    print("Accel X: "..dataAccel[1].." Mag X: "..dataMag[1])
    print("Accel Y: "..dataAccel[2].." Mag Y: "..dataMag[2])
    print("Accel Z: "..dataAccel[3].." Mag Z: "..dataMag[3])
    print("------")
  end
end