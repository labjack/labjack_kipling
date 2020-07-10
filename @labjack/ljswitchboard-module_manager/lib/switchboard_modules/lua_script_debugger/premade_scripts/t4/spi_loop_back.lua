--[[
    Name: spi_loop_back.lua
    Desc: This is an SPI example for the T4.  It tests SPI functionality using
          the standard loop-back methodology where a user must connect the MISO
          and MOSI data lines together.
    Note: See our T-Series SPI page for more detailed info on SPI settings:
            https://labjack.com/support/datasheets/t-series/digital-io/spi

          This example requires firmware 1.0023
--]]

spiutils={}

-------------------------------------------------------------------------------
--  Desc: Configures the registers necessary to use the SPI protocol
-------------------------------------------------------------------------------
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
  MB.writeName("SPI_CS_DIONUM", cs)
  -- Write the DIO register number for  clock to SPI_CLK_DIONUM
  MB.writeName("SPI_CLK_DIONUM", clk)
  -- Write the DIO register number for  MISO to SPI_MISO_DIONUM
  MB.writeName("SPI_MISO_DIONUM", miso)
  -- Write the DIO register number for  MOSI to SPI_MOSI_DIONUM
  MB.writeName("SPI_MOSI_DIONUM", mosi)
  -- Write the desired SPI mode to SPI_MODE
  MB.writeName("SPI_MODE", mode)
  -- Write the desired clock speed to SPI_SPEED_THROTTLE
  MB.writeName("SPI_SPEED_THROTTLE", speed)
  -- Write the desired SPI_OPTIONS
  MB.writeName("SPI_OPTIONS", options)
end

-------------------------------------------------------------------------------
--  Desc: Performs a transaction with SPI
-------------------------------------------------------------------------------
function spiutils.transfer(self, txdata)
  local numbytes = table.getn(txdata)

  -- Configure the number of bytes to read/write (write to SPI_NUM_BYTES)
  MB.writeName("SPI_NUM_BYTES", numbytes)
-- SPI_DATA_TX is a buffer for data to send to slave devices
  local errorval = MB.writeNameArray("SPI_DATA_TX", numbytes, txdata)
  -- Write 1 to SPI_GO to begin the SPI transaction
  MB.writeName("SPI_GO", 1)
  -- Read SPI_DATA_RX to capture data sent back from the slave device
  local rxdata = MB.readNameArray("SPI_DATA_RX", numbytes)
  return rxdata
end

-------------------------------------------------------------------------------
--  Desc: Performs a transaction with SPI using strings for input and return
-------------------------------------------------------------------------------
function spiutils.transfer_string(self, txstring)
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
  local rxString = ""
  for i=1,numbytes do
    rxString = rxString..string.char(rxdata[i])
  end
  return rxString
end

-------------------------------------------------------------------------------
--  Desc: Returns a value for SPI_OPTIONS with either CS enabled or disabled
-------------------------------------------------------------------------------
function spiutils.disable_cs(self, autodisable)
  local autodisableval = autodisable and 1 or 0
  return autodisableval*1
end

-------------------------------------------------------------------------------
--  Desc: Returns a value for SPI_MODE to configure clock polarity and phase
-------------------------------------------------------------------------------
function spiutils.calculate_mode(self, cpol, cpha)
  local cpolval = cpol and 1 or 0
  local cphaval = cpha and 1 or 0
  return cpolval*2 + cphaval*1
end


-- Disable truncation warnings (truncation should not be a problem in this script)
MB.writeName("LUA_NO_WARN_TRUNCATION", 1)
print ("T4 SPI Loop-Back Example")
local spi = spiutils
-- Use DIO8 for chip select
local cs=8
-- Use DIO9 for clock
local clk=9
-- Use DIO6 for MISO
local miso=6
-- Use DIO7 for MOSI
local mosi=7
-- Set the mode such that the clock idles at 0 with phase 0
local mode = spi.calculate_mode(spi, false, false)
-- Set the clock at default speed (~800KHz)
local speed = 0
-- Set the options such that there are no special operation (such as disabling CS)
local options = spi.disable_cs(spi, false)
-- Configure the SPI bus
spi.configure(spi, cs, clk, miso, mosi, mode, speed, options, false)
local txstring = "Hello_world"
print("Transfered String: "..txstring)
local rxString = spi.transfer_string(spi, txstring)
print("Received String: "..rxString)
-- Write 0 to LUA_RUN to stop the script
MB.writeName("LUA_RUN", 0)