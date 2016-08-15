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

I2C_Utils= {}
function I2C_Utils.configure(self, sda, scl, speed, options, slave, debug)--Returns nothing
  self.sda = sda --FIO0:7 = 0:7, EIO0:7 = 8:15, CIO0:7 = 16:23
  self.scl = scl --FIO0:7 = 0:7, EIO0:7 = 8:15, CIO0:7 = 16:23
  self.speed = speed ----0=fastest; 65535=fastest; 65534, 65533, etc. gets slower.
  self.options = options
  self.slave = slave --7-bit slave address
  self.speed = speed
  self.debugEn = debugEn
  MB.W(5100, 0, self.sda)
  MB.W(5101, 0, self.scl)
  MB.W(5102, 0, self.speed)
  MB.W(5103, 0, self.options)
  MB.W(5104, 0, self.slave)
end
function I2C_Utils.data_read(self, numBytesRX)--Returns an array of {numAcks, Array of {bytes returned}}
  local numBytesTX = 0
  MB.W(5108, 0, numBytesTX)
  MB.W(5109, 0, numBytesRX)
  MB.W(5110, 0, 1)
  local dataRX = MB.RA(5160, 99, numBytesRX)
  local numAcks = MB.R(5114, 1)
  return {numAcks, dataRX}
end
function I2C_Utils.data_write(self, dataTX)--Returns an array of {NumAcks, errorVal}
  local numBytesRX = 0
  local numBytesTX = table.getn(dataTX)
  MB.W(5108, 0, numBytesTX)
  MB.W(5109, 0, numBytesRX)
  local errorVal = MB.WA(5120, 99, numBytesTX, dataTX)
  MB.W(5110, 0, 1)
  local numAcks = MB.R(5114, 1)
  return {numAcks, errorVal}
end
function I2C_Utils.data_write_and_read(self, dataTX, numBytesRX)--Returns an array of {numAcks, Array of {bytes returned}, errorVal}
  local numBytesTX = table.getn(dataTX)
  MB.W(5108, 0, numBytesTX)
  MB.W(5109, 0, numBytesRX)
  local errorVal = MB.WA(5120, 99, numBytesTX, dataTX)
  MB.W(5110, 0, 1)
  local numAcks = MB.R(5114, 1)
  local dataRX = MB.RA(5160, 99, numBytesRX)
  return {numAcks, dataRX, errorVal}
end
function I2C_Utils.calc_options(self, resetAtStart, noStopAtStarting, disableStretching)--Returns a number 0-7
  self.resetAtStart = resetAtStart
  self.noStop = noStopAtStarting
  self.disableStre = disableStretching
  local optionsVal = 0
  optionsVal = self.resetAtStart*1+self.noStop*2+self.disableStre*4
  return optionsVal
end
function I2C_Utils.find_all(self, minAddr, maxAddr)--Returns an array of all valid addresses, in number form
  local validAddresses = {}
  for slaveAddr = minAddr, maxAddr do
    MB.W(5104, 0, slaveAddr)
    local numBytesTX = 0
    local numBytesRX = 0
    MB.W(5108, 0, numBytesTX)
    MB.W(5109, 0, numBytesRX)
    MB.W(5110, 0, 1)
    local numAcks = MB.R(5114, 1)
    if numAcks ~= 0 then
      table.insert(validAddresses,slaveAddr)
    end
    for j = 0, 2000 do end
  end
  local addrLen = table.getn(validAddresses)
  if addrLen == 0 then
    print("No valid addresses were found")
  end
  MB.W(5104, 0, self.slave)
  return validAddresses
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

magI2C = I2C_Utils
accelI2C = I2C_Utils
gyroI2C = I2C_Utils

magAddr = 0x1E
magI2C.configure(magI2C, 13, 12, 65516, 0, magAddr, 0)--configure the I2C Bus
accelAddr = 0x19
accelI2C.configure(accelI2C, 13, 12, 65516, 0, accelAddr, 0)--configure the I2C Bus
gyroAddr = 0x6B
gyroI2C.configure(accelI2C, 13, 12, 65516, 0, gyroAddr, 0)--configure the I2C Bus

addrs = magI2C.find_all(magI2C, 0, 127)
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
magI2C.data_write(magI2C, {0x00, 0x14})
magI2C.data_write(magI2C, {0x01, 0x20})
magI2C.data_write(magI2C, {0x02, 0x00})
--init accel slave
MB.W(5104, 0, accelAddr)--change target to accelerometer
accelI2C.data_write(accelI2C, {0x20, 0x27})
accelI2C.data_write(accelI2C, {0x23, 0x49})
--init gyro slave
MB.W(5104, 0, gyroAddr)--change target to gyro
gyroI2C.data_write(gyroI2C, {0x21, 0x00})--1. Write CTRL2
gyroI2C.data_write(gyroI2C, {0x22, 0x00})--2. Write CTRL3
gyroI2C.data_write(gyroI2C, {0x23, 0x60})--3. Write CTRL4
gyroI2C.data_write(gyroI2C, {0x25, 0x00})--5. Write Reference
gyroI2C.data_write(gyroI2C, {0x24, 0x00})--9. Write CTRL5
gyroI2C.data_write(gyroI2C, {0x20, 0xBF})--10. Write CTRL1

LJ.IntervalConfig(0, 100)
while true do
  if LJ.CheckInterval(0) then
    --begin Magnetometer data read--
    MB.W(5104, 0, magAddr)--change target to magnetometer
    dataMagRaw = {}
    for i=0, 5 do
      magI2C.data_write(magI2C, {0x03+i})
      dataMagIn = magI2C.data_read(magI2C, 1)[2][1]  
      table.insert(dataMagRaw, dataMagIn)
    end
    dataMag = {}
    table.insert(dataMag, convert_16_bit(dataMagRaw[1], dataMagRaw[2], 1100))
    table.insert(dataMag, convert_16_bit(dataMagRaw[3], dataMagRaw[4], 1100))
    table.insert(dataMag, convert_16_bit(dataMagRaw[5], dataMagRaw[6], 980))
    
    --begin Accelerometer data read--
    MB.W(5104, 0, accelAddr)--change target to accelerometer
    dataAccelRaw = {}
    for i=0, 5 do
      accelI2C.data_write(accelI2C, {0x28+i})
      dataAccelIn = accelI2C.data_read(accelI2C, 1)[2][1]  
      table.insert(dataAccelRaw, dataAccelIn)
    end
    dataAccel = {}
    table.insert(dataAccel, convert_16_bit(dataAccelRaw[1], dataAccelRaw[2], (0x7FFF/2)))
    table.insert(dataAccel, convert_16_bit(dataAccelRaw[3], dataAccelRaw[4], (0x7FFF/2)))
    table.insert(dataAccel, convert_16_bit(dataAccelRaw[5], dataAccelRaw[6], (0x7FFF/2)))
    
    --Begin gyro data read--
    MB.W(5104, 0, gyroAddr)--change target to accelerometer
    dataGyroRaw = {}
    for i=0, 5 do
      gyroI2C.data_write(gyroI2C, {0x28+i})
      dataGyroIn = gyroI2C.data_read(gyroI2C, 1)[2][1]  
      table.insert(dataGyroRaw, dataGyroIn)
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