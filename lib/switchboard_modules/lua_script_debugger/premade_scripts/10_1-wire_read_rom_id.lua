--[[
    Name: 10_1-wire_read_rom_id.lua
    Desc: Example showing how to read the ROM ID of a DS18B20 1-wire sensor
    Note: There are several kinds of 1-wire sensors from Maxim. Some variants:
          DS1820, DS1821, DS1822, DS18S20, and DS18B20.
          T7 1-Wire documentation
            http://labjack.com/support/datasheets/t7/digital-io/1-wire
          DS18B20 datasheet:
            http://datasheets.maximintegrated.com/en/ds/DS18B20.pdf

          The data line (DQ) needs a pullup resister of 2.2-4.7 kΩ to VS.
          This example used a 3.3kΩ resistor between VS and EIO0
          FIO lines can NOT be used for 1-Wire. They have too much impedance
          which prevent the signal from reaching logic thresholds
--]]


print ("Read the ROM ID of a single DS18B20 1-Wire sensor.")
-- Use the EIO0 (DIO8) register for the data line
local sensorpin = 8
-- The sensor registration number stored in ROM is 64-bits, so it requires 4
-- 16-bit numbers to get a reading
local rom = {}
rom[1] = 0
rom[2] = 0
rom[3] = 0
rom[4] = 0

-- Write the sensor pin number to ONEWIRE_DQ_DIONUM to set the data line (DQ)
MB.writeName("ONEWIRE_DQ_DIONUM", sensorpin)
--Write to ONEWIRE_FUNCTION to set the ROM function. 51(0x33)=Read, 240(0xF0)=Search
MB.writeName("ONEWIRE_FUNCTION", 51)
-- Write 1 to ONEWIRE_GO to perform a 1-wire transaction
-- Note: For this to work properly only one device may be connected to the bus
MB.writeName("ONEWIRE_GO", 1)

-- ONEWIRE_SEARCH_RESULT_H returns the upper 32 bits of the search result
-- ONEWIRE_SEARCH_RESULT_L returns the lower 32 bits of the search result
-- These registers are next to each other, so MB.RA can be used to read both
-- and get the entire ROM data
rom, error = MB.RA(5328, 0, 4)
print("MW:", rom[1],"UW:", rom[2],"HW:", rom[3],"LW:", rom[4])
--Write down these 4 numbers so that you can directly address this sensor later.
--See the "DS18B20 Temperature (1-Wire)" sensor example for details on acquiring a temperature reading

-- Writing 0 to LUA_RUN stops the script
MB.writeName("LUA_RUN", 0)