print("Communicate with a HMC6352 via I2C")
--When using I2C remember to wire SDA and SCL to VS through a resistor (pull-up).
--Usually something in the range of 1.8kΩ to 20kΩ will work, but HMC6352 documentation
--indicates that 10kΩ pull-up resistors are optimal.
--For more T7 information, see http://labjack.com/support/datasheets/t7/digital-io/i2c
--HMC6352 datasheet, see https://www.sparkfun.com/datasheets/Components/HMC6352.pdf

local mbReadArray=MB.RA			--local functions for faster processing
local mbWrite=MB.W
local mbWriteArray=MB.WA

local slave_address = 0x21 --Default for HMC6352 is 0x21. (0x42 if the read/write bit is included)

local numBytesTX = 0
local numBytesRX = 0
local processing = 0
local error_val = 0

local dataTX = {}
local dataRX = {}
dataRX[1] = 0x0    --initialize receive array to all 0s
dataRX[2] = 0x0

mbWrite(5100, 0, 0) --SDA digital I/O. Address is 5100, type is 0, value is 0 (FIO0)
mbWrite(5101, 0, 1) --SCL digital I/O. Address is 5101, type is 0, value is 1 (FIO1)
                 -- Don't forget 10kΩ pull-up resistors
mbWrite(5102, 0, 60000) --I2C throttle. Set throttle to help with timing
mbWrite(5103, 0, 0) --I2C options. Restarts will use a stop and a start


mbWrite(1002, 3, 3.3) -- Sett DACx to 3.3. Wire Vcc to either DAC0 or DAC1
mbWrite(1000, 3, 3.3) -- Sett DACx to 3.3. Wire Vcc to either DAC0 or DAC1

mbWrite(5104, 0, slave_address)  --write slave address

-- Exit sleep mode
numBytesTX = 1
mbWrite(5108, 0, numBytesTX)       --I2C bytes to transmit
mbWrite(5109, 0, numBytesRX)       --I2C bytes to recieve
dataTX[1] = 0x57  --exit sleep command
error_val = mbWriteArray(5120, 99, numBytesTX, dataTX)  --write commands to 5120
mbWrite(5110, 0, 1)  -- I2C Go


-- TX Data for reading single point of angle data
dataTX[1] = 0x41
LJ.IntervalConfig(0, 1000)
local checkInterval=LJ.CheckInterval
print("Angle measured as if 0 deg is north, 90 deg is east.")
while true do
  if checkInterval(0) then         --interval completed

    numBytesTX=1
    numBytesRX = 2
    
    mbWrite(5108, 0, numBytesTX)       --I2C bytes to transmit
    mbWrite(5109, 0, numBytesRX)       --I2C bytes to receive
    
    error_val = mbWriteArray(5120, 99, numBytesTX, dataTX)    --load I2C TX data
    mbWrite(5110, 0, 1)              --I2C go!
    dataRX, error_val = mbReadArray(5160, 99, numBytesRX)     --view I2C RX data
    xval=bit.bor(bit.lshift(dataRX[1],8),dataRX[2])   --concatinate data[1] and [2]
    if dataRX[1]>=80 then   --check for neg value in sig 2s complement
      xval=xval-65534
    end
    xval=xval/10   --Divide by ten because of accuracy scale factor
    print ("Angle from magnetic North is:", xval, "degrees.")
  
  end
end