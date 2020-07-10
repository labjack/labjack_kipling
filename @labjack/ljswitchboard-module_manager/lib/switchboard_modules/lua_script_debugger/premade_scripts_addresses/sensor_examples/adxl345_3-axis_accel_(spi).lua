print("Communicate with an ADXL345 SPI accelerometer")
--An I2C version of this script is available under the I2C Lua script folder
--For more information about SPI on the T7, see the T7 datasheet
--https://labjack.com/support/datasheets/t7/digital-io/spi
--For more information on the ADXL345, see the datasheet
--http://www.analog.com/static/imported-files/data_sheets/ADXL345.pdf
--Supply voltage is 3.3V.  In this example it is being powered by DAC0, but users
--may also provide power by using another T7 digital I/O set to output high

local mbReadArray=MB.RA			--Local functions for faster processing
local mbWrite=MB.W
local mbWriteArray=MB.WA

--T7 SPI configuration----------------------------------------------------------
--Using 4 wire SPI (typical)

local SPI_MODE = 3    --CPOL/CPHA = 1/1
local SPI_SPEED = 0   --Default=0 corresponds to 65536, which  is ~1MHz xfer speed
local AUTO_CS_DIS = 0 --Default=0 corresponds with automatic chip select enabled

--Configure T7s SPI pins
devType = MB.R(60000, 3)
if devType == 7 then--if T7
	mbWrite(5000, 0, 0)  --CS (FIO0)
	mbWrite(5001, 0, 1)  --CLK
	mbWrite(5002, 0, 2)  --MISO
	mbWrite(5003, 0, 3)  --MOSI (FIO3)
elseif devType == 4 then--if T4
	mbWrite(5000, 0, 4)  --CS (FIO4)
	mbWrite(5001, 0, 5)  --CLK
	mbWrite(5002, 0, 6)  --MISO
	mbWrite(5003, 0, 7)  --MOSI (FIO7)
end

mbWrite(5004, 0, SPI_MODE)     --SPI_MODE is address 5004
mbWrite(5005, 0, SPI_SPEED)    --SPI_SPEED_THROTTLE is address 5005
mbWrite(5006, 0, AUTO_CS_DIS)  --SPI_OPTIONS is address 5006

mbWrite(1000, 3, 3.3)          --Set the DAC0 line to 3.3V to power the ADXL345
--END T7 SPI configuration------------------------------------------------------



--ADXL345 Configuration---------------------------------------------------------
-- The ADXL345 has a lot of configuration options, this example assumes some
-- registers begin at their startup values.  See the ADXL345 datasheet for details
-- DEVID = 0x00        --The device ID, value will be 0xE5 (229 decimal)

-- DATAX0 = 0x32       --X-Axis Data 0
-- DATAX1 = 0x33       --X-Axis Data 1
-- DATAY0 = 0x34       --Y-Axis Data 0
-- DATAY1 = 0x35       --Y-Axis Data 1
-- DATAZ0 = 0x36       --Z-Axis Data 0
-- DATAZ1 = 0x37       --Z-Axis Data 1


--prepare a packet to read the device ID
local numBytes = 2

local dataTX = {}
--NOTE: The address byte must have bit 6 set=1 for multiple consecutive bytes.
--For READ, bit 7 must be set=1.  For WRITE, bit 7 is cleared=0. Thus, to read
--the device ID, the complete address becomes 0xC0
dataTX[1] = 0xC0    --Address byte READ (0x80), combined with Multiple consecutive (0x40), combined with DeviceID (0x00)
dataTX[2] = 0x00
mbWrite(5009, 0, numBytes)                     --SPI_NUM_BYTES address is 5009, type is 0
error = mbWriteArray(5010, 99, numBytes, dataTX)   --SPI_DATA_TX address is 5010, typs is 99

mbWrite(5007, 0, 1)                            --SPI GO

local dataRX = {}
dataRX[1] = 0x00                            --initialize receive array to all 0s
dataRX[2] = 0x00
dataRX, error = MB.RA(5050, 99, numBytes)   --SPI_DATA_RX address is 5050, type is 99
print("ADXL345 device ID: ", dataRX[2])



--configure output data rate power mode for 800Hz, since clock is 1MHz
dataTX[1] = 0x2C    --WRITE to BW_RATE (0x2C)
dataTX[2] = 0x0D    --Rate code is 0x0D=1101=800Hz
error = mbWriteArray(5010, 99, numBytes, dataTX)   --SPI_DATA_TX
mbWrite(5007, 0, 1)                            --SPI GO

--Set the wakeup bit
dataTX[1] = 0x2D    --WRITE to POWER_CTL (0x2D)
dataTX[2] = 0x08    --Set Wakeup bit (bit 3)
error = mbWriteArray(5010, 99, numBytes, dataTX)   --SPI_DATA_TX
mbWrite(5007, 0, 1)                            --SPI GO

--Set to full resolution (resolution increases with g range)
dataTX[1] = 0x31    --WRITE to POWER_CTL (0x2D)
dataTX[2] = 0x08    --Set FULL_RES bit (bit 3)
error = mbWriteArray(5010, 99, numBytes, dataTX)   --SPI_DATA_TX
mbWrite(5007, 0, 1)                            --SPI GO

--Bypass FIFO mode
dataTX[1] = 0x38    --WRITE to FIFO_CTL (0x38)
dataTX[2] = 0x00    --disable everything FIFO
error = mbWriteArray(5010, 99, numBytes, dataTX)   --SPI_DATA_TX
mbWrite(5007, 0, 1)                            --SPI GO

--END ADXL345 Configuration-----------------------------------------------------



LJ.IntervalConfig(0, 500)       --set interval to 500 for 500ms
local checkInterval=LJ.CheckInterval
while true do
  if checkInterval(0) then   --interval completed
    numBytes = 7
	  dataTX[1] = 0xF2    --Address byte READ (0x80), combined with Multiple consecutive (0x40), combined with DATAX0 (0x32)
    dataTX[2] = 0x00
    dataTX[3] = 0x00
    dataTX[4] = 0x00
    dataTX[5] = 0x00
    dataTX[6] = 0x00
    dataTX[7] = 0x00
    mbWrite(5009, 0, numBytes)                     --SPI_NUM_BYTES
    error = mbWriteArray(5010, 99, numBytes, dataTX)   --SPI_DATA_TX
    
    
    mbWrite(5007, 0, 1)                            --SPI GO
    
    dataRX[1] = 0x00    --initialize receive array to all 0s
    dataRX[2] = 0x00
    dataRX[3] = 0x00
    dataRX[4] = 0x00
    dataRX[5] = 0x00
    dataRX[6] = 0x00
    dataRX[7] = 0x00
    dataRX, error = mbReadArray(5050, 99, numBytes)   --SPI_DATA_RX address is 5050, type is 99
    
    
    --for key,value in pairs(dataRX) do print(key,value) end
    print("X0: ", dataRX[2])
    print("X1: ", dataRX[3])
    print("Y0: ", dataRX[4])
    print("Y1: ", dataRX[5])
    print("Z0: ", dataRX[6])
    print("Z1: ", dataRX[7])
    print("\n")
    
  end
end