print("Communicate with an SRF02 I2C ultrasonic range sensor")
--When using I2C remember to wire SDA and SCL to VS through a resistor (pull-up).
--Usually something in the range of 1.8kΩ to 4.7kΩ will work, but SRF02 documentation
--indicates that 1.8kΩ pull-up resistors are optimal.
--For more T7 information, see http://labjack.com/support/datasheets/t7/digital-io/i2c
--For more on the SRF02, see http://www.robot-electronics.co.uk/htm/srf02techI2C.htm

local mbReadArray=MB.RA			--local functions for faster processing
local mbWrite=MB.W
local mbWriteArray=MB.WA

local slave_address = 0x70 --Default for SRF02 is 0x70. (0xE0 if the read/write bit is included)

local numBytesTX = 0
local numBytesRX = 0
local processing = 0
local error_val = 0

local dataTX = {}
dataTX[1] = 0x00    --SRF02 command register is 0x00, range command is 0x50
dataTX[2] = 0x50
--result in inches (0x50), in cm (0x51), in micro-seconds (0x52)
local dataRX = {}
dataRX[1] = 0x00    --initialize receive array to all 0s
dataRX[2] = 0x00
dataRX[3] = 0x00
dataRX[4] = 0x00

mbWrite(5100, 0, 1) --SDA digital I/O. Address is 5100, type is 0, value is 1 (FIO1)
mbWrite(5101, 0, 0) --SCL digital I/O. Address is 5101, type is 0, value is 0 (FIO0)
mbWrite(5102, 0, 0) --I2C throttle. No throttle, speed is ~450 kHz
mbWrite(5103, 0, 0) --I2C options. Restarts will use a stop and a start

mbWrite(5104, 0, slave_address)          --Set the I2C slave address.

LJ.IntervalConfig(0, 900)             --set interval to 900 for 900ms
local checkInterval=LJ.CheckInterval
while true do
  if checkInterval(0) then         --interval completed
    if processing == 0 then           --ready to acquire a new reading
      numBytesTX = 2
      numBytesRX = 0
      
      mbWrite(5108, 0, numBytesTX)       --I2C bytes to transmit
      mbWrite(5109, 0, numBytesRX)       --I2C bytes to receive
      error_val = mbWriteArray(5120, 99, numBytesTX, dataTX)    --load I2C TX data
      
      mbWrite(5110, 0, 1)                --I2C Go
      
      processing = 1
      LJ.IntervalConfig(0, 100)       --set interval to 100 for 100ms to give the range finder some processing time
    elseif processing == 1 then
      numBytesTX = 0
      numBytesRX = 4
      
      mbWrite(5108, 0, numBytesTX)       --I2C bytes to transmit
      mbWrite(5109, 0, numBytesRX)       --I2C bytes to receive
      
      mbWrite(5110, 0, 1)                --I2C Go
      
      dataRX, error_val = mbReadArray(5160, 99, numBytesRX)     --view I2C RX data
      
      processing = 0
      LJ.IntervalConfig(0, 900)       --reset interval to 900ms
      print ("Range is:", dataRX[3], "inches")
    end
  end
end