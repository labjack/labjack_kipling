--This is an example that uses the BMP180 Barometric Pressure/Temperature/Altitude sensor on the I2C Bus on EIO4(SCL) and EIO5(SDA)
--See the datasheet (page 13-17) for calibration constant information & calculation information
--Outputs data to Registers:
--46018 = temp data
--46020 = humidity data
--46022 thru 46042 = calibration constants
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
      -- print("0x"..string.format("%x",slave).." found")
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
  return res
end

myI2C = I2C_Utils

myI2C.configure(myI2C, 13, 12, 65516, 0, 0x77, 0)--configure the I2C Bus

addrs = myI2C.find_all(myI2C, 0, 127)
addrsLen = table.getn(addrs)
for i=1, addrsLen do--verify that the target device was found     
  if addrs[i] == 0x29 then
    print("I2C Slave Detected")
    break
  end
end

--init slave
myI2C.data_write(myI2C, {0xF4, 0x2E})
--verify operation
myI2C.data_write(myI2C, {0xD0})
raw = myI2C.data_read(myI2C, 2)[2]
if raw[1] == 0x55 then
  print("I2C Slave Detected")
end
--get calibration data
cal = {}
for i=0xAA, 0xBF do
  if i%2 == 0 then
    myI2C.data_write(myI2C, {i})
    raw = myI2C.data_read(myI2C, 2)[2]
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
      myI2C.data_write(myI2C, {0xF4, 0x2E})--0x2E for temp, 0x34 for pressure
      LJ.IntervalConfig(0, 50)
      stage = 1
    elseif stage == 1 then
      rawT = {}
      myI2C.data_write(myI2C, {0xF6})--MSB = F6
      rawT[1] = myI2C.data_read(myI2C, 2)[2][1]
      myI2C.data_write(myI2C, {0xF7})--LSB = F7
      rawT[2] = myI2C.data_read(myI2C, 2)[2][1]
      UT = rawT[1]*256+rawT[2]
      MB.W(46018, 3, UT) 
      print("Temperature Data: "..UT)
      LJ.IntervalConfig(0, 50)
      stage = 2
    elseif stage == 2 then
      myI2C.data_write(myI2C, {0xF4, 0x34})--0x2E for temp, 0x34 for pressure
      LJ.IntervalConfig(0, 50)
      stage = 3
    elseif stage == 3 then
      rawP = {}
      myI2C.data_write(myI2C, {0xF6})--MSB = F6
      rawP[1] = myI2C.data_read(myI2C, 2)[2][1]
      myI2C.data_write(myI2C, {0xF7})--LSB = F7
      rawP[2] = myI2C.data_read(myI2C, 2)[2][1]
      UP = rawP[1]*256+rawP[2]
      MB.W(46020, 3, UP) 
      print("Pressure Data: "..UP)
      LJ.IntervalConfig(0, 1000)
      stage = 0
    end
  end
end