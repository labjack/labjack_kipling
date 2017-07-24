--This is an example that uses the ADAFRUIT 10-DOF IMU BREAKOUT, which contains the L3GD20H gyro and the LSM303 Accelerometer & Magnetometer 
--This is configured for the I2C Bus on EIO4(SCL) and EIO5(SDA)
--Outputs data to Registers:
--X accel = 46000
--Y accel = 46002
--Z accel = 46004
--X mag = 46006
--Y mag = 46008
--Z mag = 46010
--X gyro = 46012
--Y gyro = 46014
--Z gyro = 46016

magAddr = 0x1E
accelAddr = 0x19
gyroAddr = 0x6B
I2C.config(13, 12, 65516, 0, magAddr, 0)--configure the I2C Bus

function convert_16_bit(msb, lsb, conv)--Returns a number, adjusted using the conversion factor. Use 1 if not desired  
  res = 0
  if msb >= 128 then
    res = (-0x7FFF+((msb-128)*256+lsb))/conv
  else
    res = (msb*256+lsb)/conv
  end
  return res
end

addrs = I2C.search(0, 127)
addrsLen = table.getn(addrs)
for i=1, addrsLen do--verify that the target device was found     
  if addrs[i] == magAddr then
    print("I2C Magnetometer Slave Detected")
  end
  if addrs[i] == accelAddr then
    print("I2C Accelerometer Slave Detected")
  end
  if addrs[i] == gyroAddr then
    print("I2C Gyro Slave Detected")
  end
end

--init mag slave
MB.W(5104, 0, magAddr)--change target to magnetometer
I2C.write({0x00, 0x14})
I2C.write({0x01, 0x20})
I2C.write({0x02, 0x00})
--init accel slave
MB.W(5104, 0, accelAddr)--change target to accelerometer
I2C.write({0x20, 0x27})
I2C.write({0x23, 0x49})
--init gyro slave
MB.W(5104, 0, gyroAddr)--change target to gyro
I2C.write({0x21, 0x00})--1. Write CTRL2
I2C.write({0x22, 0x00})--2. Write CTRL3
I2C.write({0x23, 0x60})--3. Write CTRL4
I2C.write({0x25, 0x00})--5. Write Reference
I2C.write({0x24, 0x00})--9. Write CTRL5
I2C.write({0x20, 0xBF})--10. Write CTRL1

LJ.IntervalConfig(0, 100)
while true do
  if LJ.CheckInterval(0) then
    --begin Magnetometer data read--
    MB.W(5104, 0, magAddr)--change target to magnetometer
    dataMagRaw = {}
    for i=0, 5 do
      I2C.write({0x03+i})
      dataMagIn = I2C.read(1)
      table.insert(dataMagRaw, dataMagIn[1])
    end
    dataMag = {}
    table.insert(dataMag, convert_16_bit(dataMagRaw[1], dataMagRaw[2], 1100))
    table.insert(dataMag, convert_16_bit(dataMagRaw[3], dataMagRaw[4], 1100))
    table.insert(dataMag, convert_16_bit(dataMagRaw[5], dataMagRaw[6], 980))
    
    --begin Accelerometer data read--
    MB.W(5104, 0, accelAddr)--change target to accelerometer
    dataAccelRaw = {}
    for i=0, 5 do
      I2C.write({0x28+i})
      dataAccelIn = I2C.read(1)
      table.insert(dataAccelRaw, dataAccelIn[1])
    end
    dataAccel = {}
    table.insert(dataAccel, convert_16_bit(dataAccelRaw[1], dataAccelRaw[2], (0x7FFF/2)))
    table.insert(dataAccel, convert_16_bit(dataAccelRaw[3], dataAccelRaw[4], (0x7FFF/2)))
    table.insert(dataAccel, convert_16_bit(dataAccelRaw[5], dataAccelRaw[6], (0x7FFF/2)))
    
    --Begin gyro data read--
    MB.W(5104, 0, gyroAddr)--change target to accelerometer
    dataGyroRaw = {}
    for i=0, 5 do
      I2C.write({0x28+i})
      dataGyroIn = I2C.read(1)
      table.insert(dataGyroRaw, dataGyroIn[1])
    end
    dataGyro = {}
    for i=0, 2 do
      table.insert(dataGyro, convert_16_bit(dataGyroRaw[1+i*2], dataGyroRaw[2+i*2], (0x7FFF/2000)))
    end
    --Report results to print() and User RAM--
    for i=0, 2 do--report mag to RAM
      MB.W(46006+i*2, 3, dataMag[i+1])
    end
    for i=0, 2 do--report accel to RAM
      MB.W(46000+i*2, 3, dataAccel[i+1])
    end
    for i=0, 2 do--report gyro to RAM
      MB.W(46012+i*2, 3, dataGyro[i+1])
    end
    print("Accel X: "..dataAccel[1].." Mag X: "..dataMag[1].." Gyro X: "..dataGyro[1])
    print("Accel Y: "..dataAccel[2].." Mag Y: "..dataMag[2].." Gyro Y: "..dataGyro[2])
    print("Accel Z: "..dataAccel[3].." Mag Z: "..dataMag[3].." Gyro Z: "..dataGyro[3])
    print("------")
  end
end