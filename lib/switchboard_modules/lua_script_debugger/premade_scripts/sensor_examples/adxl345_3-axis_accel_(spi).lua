--[[
    Name: adxl345_3-axis_accel_(spi).lua
    Desc: This is an adxl345 accelerometer example that communicates using SPI
    Note: An I2C version of this script is available under the I2C Lua script folder

          For more information about SPI on the T7, see the T7 datasheet:
            http://labjack.com/support/datasheets/t7/digital-io/spi

          For more information on the ADXL345, see the datasheet:
            http://www.analog.com/static/imported-files/data_sheets/ADXL345.pdf

          Supply voltage is 3.3V.  In this example it is being powered by DAC0,
          but users may also provide power by using another T7 digital I/O set
          to output high
--]]

-- CPOL/CPHA = 1/1
local SPI_MODE = 3
-- Default=0 corresponds to 65536, which  is ~1MHz transfer speed
local SPI_SPEED = 0
-- Default=0 corresponds with automatic chip select enabled
local AUTO_CS_DIS = 0

print("Communicate with an ADXL345 SPI accelerometer")
--Configure T7s SPI pins
local devtype = MB.readName("PRODUCT_ID")
-- If using a T7
if devtype == 7 then
  -- Use FIO0 for CS
  MB.writeName("SPI_CS_DIONUM", 0)
  -- Use FIO1 for CLK
  MB.writeName("SPI_CLK_DIONUM", 1)
  -- Use FIO2 for MISO
  MB.writeName("SPI_MISO_DIONUM", 2)
  -- Use FIO3 for MOSI
  MB.writeName("SPI_MOSI_DIONUM", 3)
-- If using a T4
elseif devtype == 4 then
  -- Use FIO4 for CS
  MB.writeName("SPI_CS_DIONUM", 4)
  -- Use FIO5 for CLK
  MB.writeName("SPI_CLK_DIONUM", 5)
  -- Use FIO6 for MISO
  MB.writeName("SPI_MISO_DIONUM", 6)
  -- Use FIO7 for MOSI
  MB.writeName("SPI_MOSI_DIONUM", 7)
end
MB.writeName("SPI_MODE", SPI_MODE)
MB.writeName("SPI_SPEED_THROTTLE", SPI_SPEED)
MB.writeName("SPI_OPTIONS", AUTO_CS_DIS)
--Set the DAC0 line to 3.3V to power the ADXL345
MB.writeName("DAC0", 3.3)

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
local numbytes = 2
local txdata = {}
-- NOTE: The address byte must have bit 6 set=1 for multiple consecutive bytes.
-- For READ, bit 7 must be set=1.  For WRITE, bit 7 is cleared=0. Thus, to read
-- the device ID, the complete address becomes 0xC0
-- Address byte READ (0x80), combined with Multiple consecutive (0x40),
-- combined with DeviceID (0x00)
txdata[1] = 0xC0
txdata[2] = 0x00
MB.writeName("SPI_NUM_BYTES", numbytes)
error = MB.writeNameArray("SPI_DATA_TX", numbytes, txdata)
MB.writeName("SPI_GO", 1)
-- Initialize receive array to all 0
local rxdata = {}
rxdata[1] = 0x00
rxdata[2] = 0x00
rxdata, error = MB.readNameArray("SPI_DATA_RX",numbytes)
print("ADXL345 device ID: ", rxdata[2])
-- Configure output data rate power mode for 800Hz, since clock is 1MHz
-- Write to BW_RATE (0x2C)
txdata[1] = 0x2C
-- Rate code is 0x0D=1101=800Hz
txdata[2] = 0x0D
error = MB.writeNameArray("SPI_DATA_TX", numbytes, txdata)
MB.writeName("SPI_GO", 1)
-- Write to POWER_CTL (0x2D)
txdata[1] = 0x2D
-- Set Wakeup bit (bit 3)
txdata[2] = 0x08
error = MB.writeNameArray("SPI_DATA_TX", numbytes, txdata)
MB.writeName("SPI_GO", 1)
-- Set to full resolution (resolution increases with g range)
txdata[1] = 0x31
txdata[2] = 0x08
error = MB.writeNameArray("SPI_DATA_TX", numbytes, txdata)
MB.writeName("SPI_GO", 1)
--Bypass FIFO mode
-- Write to FIFO_CTL (0x38)
txdata[1] = 0x38
-- Disable everything FIFO
txdata[2] = 0x00
error = MB.writeNameArray("SPI_DATA_TX", numbytes, txdata)
MB.writeName("SPI_GO", 1)
-- Configure a 500ms interval
LJ.IntervalConfig(0, 500)

while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    numbytes = 7
    -- Send bytes
	  txdata[1] = 0xF2
    txdata[2] = 0x00
    txdata[3] = 0x00
    txdata[4] = 0x00
    txdata[5] = 0x00
    txdata[6] = 0x00
    txdata[7] = 0x00
    MB.writeName("SPI_NUM_BYTES", numbytes)
    error = MB.writeNameArray("SPI_DATA_TX", numbytes, txdata)
    MB.writeName("SPI_GO", 1)
    -- Initialize receive array to all 0 then recieve bytes
    rxdata[1] = 0x00
    rxdata[2] = 0x00
    rxdata[3] = 0x00
    rxdata[4] = 0x00
    rxdata[5] = 0x00
    rxdata[6] = 0x00
    rxdata[7] = 0x00
    rxdata, error = MB.readNameArray("SPI_DATA_RX",numbytes)
    print("X0: ", rxdata[2])
    print("X1: ", rxdata[3])
    print("Y0: ", rxdata[4])
    print("Y1: ", rxdata[5])
    print("Z0: ", rxdata[6])
    print("Z1: ", rxdata[7])
    print("\n")
  end
end