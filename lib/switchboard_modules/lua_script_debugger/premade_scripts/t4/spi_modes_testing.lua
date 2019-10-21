--[[
    Name: spi_modes_testing.lua
    Desc: This is an SPI example for the T4 that tests different SPI modes.
          This test uses the standard loop-back methodology where a user must
           connect the MISO and MOSI data lines together.
    Note: See our T-Series SPI page for more detailed info on SPI settings:
            https://labjack.com/support/datasheets/t-series/digital-io/spi
--]]

spiutils={}

function spiutils.configure(self, cs, clk, miso, mosi, mode, speed, options, debug)
  self.cs=cs
  self.clk=clk
  self.miso=miso
  self.mosi=mosi
  self.mode=mode
  self.speed=speed
  self.options=options
  self.debug=debug

  -- Write the DIO register number for chip select to SPI_CS_DIONUM
  MB.W(5000, 0, cs)
  -- Write the DIO register number for  clock to SPI_CLK_DIONUM
  MB.W(5001, 0, clk)
  -- Write the DIO register number for  MISO to SPI_MISO_DIONUM
  MB.W(5002, 0, miso)
  -- Write the DIO register number for  MOSI to SPI_MOSI_DIONUM
  MB.W(5003, 0, mosi)
  -- Write the desired SPI mode to SPI_MODE
  MB.W(5004, 0, mode)
  -- Write the desired clock speed to SPI_SPEED_THROTTLE
  MB.W(5005, 0, speed)
  -- Write the desired SPI_OPTIONS
  MB.W(5006, 0, options)
end

function spiutils.transfer(self, txdata)
  local numbytes = table.getn(txdata)

  -- Configure the number of bytes to read/write (write to SPI_NUM_BYTES)
  MB.W(5009, 0, numbytes)
-- SPI_DATA_TX is a buffer for data to send to slave devices
  local errorval = MB.WA(5010, 99, numbytes, txdata)
  -- Write 1 to SPI_GO to begin the SPI transaction
  MB.W(5007, 0, 1)
  -- Read SPI_DATA_RX to capture data sent back from the slave device
  local rxdata = MB.RA(5050, 99, numbytes)
  return rxdata
end

function spiutils.stringtransfer(self, txstring)
  local numbytes = string.len(txstring)
  -- Convert the transfer string to bytes
  local txdata={}
  for i=1,numbytes do
    txdata[i]=string.byte(txstring,i)
  end
  -- Append a null character
  --   numbytes += 1
  --   txdata[numbytes]=0

  -- Get return data from the slave device
  local rxdata = self.transfer(self, txdata)
  -- Convert the data to a string
  local rxstring = ""
  for i=1,numbytes do
    rxstring = rxstring..string.char(rxdata[i])
  end
  return rxstring
end

function spiutils.csdisable(self, autodisable)
  local autodisableval = autodisable and 1 or 0
  return autodisableval*1
end

function spiutils.calculatemode(self, cpol, cpha)
  local cpolval = cpol and 1 or 0
  local cphaval = cpha and 1 or 0
  return cpolval*2 + cphaval*1
end

print ("T4 SPI Mode Testing Example")
spi = spiutils

-- Use DIO8 for chip select
local cs=8
-- Use DIO9 for clock
local clk=9
-- Use DIO10 for MISO
local miso=10
-- Use DIO11 for MOSI
local mosi=11

-- Set the clock at default speed (~800KHz)
local speed = 0
-- Set the options such that there are no special operation (such as disabling CS)
local options = spi.csdisable(spi, false)

--Configure SPI bus
local txstring = "!cpol&!cpha"
print("Configuring for case: "..txstring)
-- Set the mode such that the clock idles at 0 with phase 0
mode = spi.calculatemode(spi, false, false)
spi.configure(spi, cs, clk, miso, mosi, mode, speed, options, false)
-- Get a return string from the slave device
local rxstring = spi.stringtransfer(spi, txstring)
print("Received String: "..rxstring)

--Configure SPI bus
txstring = "!cpol&cpha"
print("Configuring for case: "..txstring)
-- Set the mode such that the clock idles at 0 with phase 1
mode = spi.calculatemode(spi, false, true)
spi.configure(spi, cs, clk, miso, mosi, mode, speed, options, false)
-- Get a return string from the slave device
rxstring = spi.stringtransfer(spi, txstring)
print("Received String: "..rxstring)

--Configure SPI bus
txstring = "cpol&!cpha"
print("Configuring for case: "..txstring)
-- Set the mode such that the clock idles at 1 with phase 0
mode = spi.calculatemode(spi, true, false)
spi.configure(spi, cs, clk, miso, mosi, mode, speed, options, false)
-- Get a return string from the slave device
rxstring = spi.stringtransfer(spi, txstring)
print("Received String: "..rxstring)

--Configure SPI bus
txstring = "cpol&cpha"
print("Configuring for case: "..txstring)
-- Set the mode such that the clock idles at 1 with phase 1
mode = spi.calculatemode(spi, true, true)
spi.configure(spi, cs, clk, miso, mosi, mode, speed, options, false)
-- Get a return string from the slave device
rxstring = spi.stringtransfer(spi, txstring)
print("Received String: "..rxstring)

--Configure SPI bus
txstring = "disable CS"
print("Configuring for case: "..txstring)
-- Set the mode such that the clock idles at 0 with phase 0
mode = spi.calculatemode(spi, false, false)
-- Set the options such that CS is disabled
options = spi.csdisable(spi, true)
spi.configure(spi, cs, clk, miso, mosi, mode, speed, options, false)
-- Get a return string from the slave device
rxstring = spi.stringtransfer(spi, txstring)
print("Received String: "..rxstring)

--Stop the Lua Script
MB.W(6000, 1, 0)