--[[
    Name: spi_example.lua
    Desc: This example sends out a packet of data over SPI and reads it back
    Note: If the packet received matches the packet sent, SPI is working
          properly. Otherwise, there may be some issues with the SPI circuitry

          This example requires firmware 1.0282 (T7) or 1.0023 (T4)
--]]

print ("SPI Example. Jumper FIO2 (MISO) and FIO3 (MOSI) together (FIO4 and FIO5 on T4)")
-- Configure the SPI pins
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

-- Set the mode such that the clock idles at 0 with phase 0 (default)
MB.writeName("SPI_MODE", 0)
-- Use the default throttle (~800kHz)
MB.writeName("SPI_SPEED_THROTTLE", 0)
-- Disable CS
MB.writeName("SPI_OPTIONS", 1)
-- The number of bytes to transfer
MB.writeName("SPI_NUM_BYTES", 1)
local data = {{0xA, 0xB, 0xC, 0xD, 0xE, 0xF, 0x1, 0x7},
              {0xD, 0xE, 0xA, 0xD, 0xB, 0xE, 0xE, 0xF}}
-- Set which data set to use, 1 or 2
local dataselect = 2
-- Configure an interval of 100ms
LJ.IntervalConfig(0, 100)
-- Run the program in an infinite loop

while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    -- Get the number of data bytes
    local datasize = table.getn(data[dataselect])
    MB.writeName("SPI_NUM_BYTES", datasize)
    MB.writeNameArray("SPI_DATA_TX", datasize, data[dataselect])
    -- Start an SPI transaction
    MB.writeName("SPI_GO", 1)
    local rxdata = MB.readNameArray("SPI_DATA_RX", datasize)
    -- Compare the data
    local pass = 1
    for i=1,datasize do
      if(data[dataselect][i] ~= rxdata[i]) then
        print(string.format(
          "0x%x (tx) does not match 0x%x (rx)",
          data[dataselect][i],
          rxdata[i])
        )
        pass = 0
      end
    end
    if(pass == 1) then
      print("Data recieved")
    else
      print("----")
    end
  end
end
