--This is an example that uses the PS-ITG-3200 Accelerometer & Magnetometer on the I2C Bus on EIO4(SCL) and EIO5(SDA)
--Outputs data to Registers:
--X gyro = 46000
--Y gyro = 46002
--Z gyro = 46004

I2C_Utils= {}
function I2C_Utils.configure(self, isda, iscl, ispeed, ioptions, islave, idebug)--Returns nothing   
  self.sda = isda
  self.scl = iscl
  self.speed = ispeed
  self.options = ioptions
  self.slave = islave
  self.debugEn = idebug
  MB.W(5100, 0, self.sda)
  MB.W(5101, 0, self.scl)
  MB.W(5102, 0, self.speed)
  MB.W(5103, 0, self.options)
  MB.W(5104, 0, self.slave)
end
function I2C_Utils.data_read(self, inumBytesRX)--Returns an array of {numAcks, Array of {bytes returned}}   
  self.numBytesRX = inumBytesRX
  self.numBytesTX = 0
  MB.W(5108, 0, self.numBytesTX)
  MB.W(5109, 0, self.numBytesRX)
  MB.W(5110, 0, 1)
  dataRX = MB.RA(5160, 99, self.numBytesRX)
  numAcks = MB.R(5114, 1)
  return {numAcks, dataRX}
end
function I2C_Utils.data_write(self, idataTX)--Returns an array of {NumAcks, errorVal}   
  self.numBytesRX = 0
  self.dataTX = idataTX
  self.numBytesTX = table.getn(self.dataTX)
  MB.W(5108, 0, self.numBytesTX)
  MB.W(5109, 0, self.numBytesRX)
  errorVal = MB.WA(5120, 99, self.numBytesTX, self.dataTX)
  MB.W(5110, 0, 1)
  numAcks = MB.R(5114, 1)
  return {numAcks, errorVal}
end
function I2C_Utils.data_write_and_read(self, idataTX, inumBytesRX)--Returns an array of {numAcks, Array of {bytes returned}, errorVal}   
  self.dataTX = idataTX
  self.numBytesRX = inumBytesRX
  self.numBytesTX = table.getn(self.dataTX)

  MB.W(5108, 0, self.numBytesTX)
  MB.W(5109, 0, self.numBytesRX)
  errorVal = MB.WA(5120, 99, self.numBytesTX, self.dataTX)
  MB.W(5110, 0, 1)
  numAcks = MB.R(5114, 1)
  dataRX = MB.RA(5160, 99, self.numBytesRX)
  return {numAcks, dataRX, errorVal}
end
function I2C_Utils.calc_options(self, iresetAtStart, inoStopAtStarting, idisableStretching)--Returns a number 0-7    
  self.resetAtStart = iresetAtStart
  self.noStop = inoStopAtStarting
  self.disableStre = idisableStretching
  optionsVal = 0
  optionsVal = self.resetAtStart*1+self.noStop*2+self.disableStre*4
  return optionsVal
end
function I2C_Utils.find_all(self, ilower, iupper)--Returns an array of all valid addresses, in number form  
  validAddresses = {}
  origSlave = self.slave
  for i = ilower, iupper do
    slave = i
    MB.W(5104, 0, slave)
    self.numBytesTX = 0
    self.numBytesRX = 1
    MB.W(5108, 0, self.numBytesTX)
    MB.W(5109, 0, self.numBytesRX)
    MB.W(5110, 0, 1)
    numAcks = MB.R(5114, 1)
    
    if numAcks ~= 0 then
      table.insert(validAddresses, i)
      --print("0x"..string.format("%x",slave).." found")
    end
    for j = 0, 1000 do
      --delay
    end
  end
  addrLen = table.getn(validAddresses)
  if addrLen == 0 then
    print("No valid addresses were found  over the range")
  end
  MB.W(5104, 0, origSlave)
  return validAddresses
end
function convert_16_bit(msb, lsb, conv)--Returns a number, adjusted using the conversion factor. Use 1 if not desired  
  res = 0
  if msb >= 128 then
    res = (-0x7FFF+((msb-128)*256+lsb))/conv
  else
    res = (msb*256+lsb)/conv
  end
  return -1*res
end

--Initialize I2C library
myI2C = I2C_Utils

myI2C.configure(myI2C, 13, 12, 65516, 0, 0x69, 0)--configure the I2C Bus

addrs = myI2C.find_all(myI2C, 0, 127)
addrsLen = table.getn(addrs)
for i=1, addrsLen do--verify that the target device was found     
  if addrs[i] == 0x69 then
    print("I2C Slave Detected")
    break
  end
end

--init sensor
myI2C.data_write(myI2C, {0x15, 0x00})
myI2C.data_write(myI2C, {0x16, 0x18})
myI2C.data_write(myI2C, {0x3E, 0x00})


LJ.IntervalConfig(0, 200)             --set interval to 200 for 200ms

while true do
  if LJ.CheckInterval(0) then
    reg = 0x1D--change to 0x1B for temperature, 0x1D for X-axis, 0x1F for Y axis, and 0x21 for Z axis, see page 22 of datasheet for more info
    raw = {0, 0}
    raw[1] = myI2C.data_write_and_read(myI2C, {reg}, 1)[2][1]
    raw[2] = myI2C.data_write_and_read(myI2C, {reg+1}, 1)[2][1]
    raw[3] = myI2C.data_write_and_read(myI2C, {reg+2}, 1)[2][1]
    raw[4] = myI2C.data_write_and_read(myI2C, {reg+3}, 1)[2][1]
    raw[5] = myI2C.data_write_and_read(myI2C, {reg+4}, 1)[2][1]
    raw[6] = myI2C.data_write_and_read(myI2C, {reg+5}, 1)[2][1]
    rateX = convert_16_bit(raw[1], raw[2], 14.375)
    rateY = convert_16_bit(raw[3], raw[4], 14.375)
    rateZ = convert_16_bit(raw[5], raw[6], 14.375)
    print("X: "..rateX)--rate = rotational rate in degrees per second (°/s)
    print("Y: "..rateY)
    print("Z: "..rateZ)
    MB.W(46000, 3, rateX)--write to modbus registers USER_RAM0_F32
    MB.W(46002, 3, rateY)--write to modbus registers USER_RAM1_F32
    MB.W(46004, 3, rateZ)--write to modbus registers USER_RAM2_F32
  end
end
