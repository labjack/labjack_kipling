 --This is an example that uses the SX1509 I/O Expander on the I2C Bus on EIO4(SCL) and EIO5(SDA)
--[[
User RAM registers- change these in another program (LabVIEW, Python, C++ and more) to change the state of pins

chanAdata  = 46080
chanBdata  = 46082
chanAdir   = 46084
chanBdir   = 46086
chanAinput = 46088
chanBinput = 46090
chanApup   = 46092
chanBpup   = 46094
]]--
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

myI2C = I2C_Utils

SLAVE_ADDRESS = 0x3E
myI2C.configure(myI2C, 13, 12, 65516, 0, SLAVE_ADDRESS, 0)--configure the I2C Bus

addrs = myI2C.find_all(myI2C, 0, 127)
addrsLen = table.getn(addrs)
for i=1, addrsLen do--verify that the target device was found     
  if addrs[i] == SLAVE_ADDRESS then
    print("I2C Slave Detected")
    break
  end
end

--Channel A is 0-7, Channel B is 8-15
chanAdir = MB.R(46084, 2)--1 = output, 0 = input
chanBdir = MB.R(46086, 2)

chanApup = MB.R(46092, 2)--0 = pullup enabled, 1 = disabled
chanBpup = MB.R(46094, 2)

--config clock and debounce
myI2C.data_write(myI2C, {0x1E, 0x4F})--config clock
myI2C.data_write(myI2C, {0x1F, 0x70})--RegMisc

--config channel A inputs/outputs
myI2C.data_write(myI2C, {0x01, chanAdir})--input buffer disable
myI2C.data_write(myI2C, {0x07, chanApup})--pull up disable
myI2C.data_write(myI2C, {0x0B, chanAdir})--open drain
myI2C.data_write(myI2C, {0x0F, 0xFF-chanAdir})--output
myI2C.data_write(myI2C, {0x11, 0xFF})--all LED off (initially)
myI2C.data_write(myI2C, {0x21, 0x00})--disable LED Driver for ALL(which diables PWM and fade)
--config channel B inputs/outputs
myI2C.data_write(myI2C, {0x01-1, chanBdir})
myI2C.data_write(myI2C, {0x07-1, chanBpup})
myI2C.data_write(myI2C, {0x0B-1, chanBdir})
myI2C.data_write(myI2C, {0x0F-1, 0xFF-chanBdir})
myI2C.data_write(myI2C, {0x11-1, 0xFF})
myI2C.data_write(myI2C, {0x21-1, 0x00})

LJ.IntervalConfig(0, 10)--check every 10ms
while true do
  if LJ.CheckInterval(0) then
    if MB.R(46080, 2) ~= data then
      --Read Inputs
      myI2C.data_write(myI2C, {0x11})
      chanAinput = myI2C.data_read(myI2C, 1)[2][1]
      myI2C.data_write(myI2C, {0x11-1})
      chanBinput = myI2C.data_read(myI2C, 1)[2][1]
      MB.W(46088, 2, chanAinput)
      MB.W(46090, 2, chanBinput)
      --Write Outputs
      chanAdata = MB.R(46080, 2)
      myI2C.data_write(myI2C, {0x11, chanAdata})--all LEDs written depending on User RAM Register
      chanBdata = MB.R(46082, 2)
      myI2C.data_write(myI2C, {0x11-1, chanBdata})--all LEDs written depending on User RAM Register
    end
  end
end