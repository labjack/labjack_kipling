print ("Read the ROM ID of a single DS18B20 1-Wire sensor.")
--Note, there are several kinds of 1-wire sensors from Maxim.
--Some variants: DS1820, DS1821, DS1822, DS18S20, and DS18B20.
--T7 1-Wire documentation
--http://labjack.com/support/datasheets/t7/digital-io/1-wire
--DS18B20 datasheet
--http://datasheets.maximintegrated.com/en/ds/DS18B20.pdf

--The data line(DQ) needs a pullup resister of 2.2-4.7 kΩ to VS.
--This example used a 3.3kΩ resistor between VS and EIO0
--FIO lines can NOT be used for 1-Wire. They have too much impedance 
--which prevent the signal from reaching logic thresholds

local SensorPinNum = 8	-- EIO0 aka digital I/O 8
local ROM = {}          -- The sensor registration number stored in ROM, it's 64-bits so requires 4 16-bit numbers
ROM[1] = 0
ROM[2] = 0
ROM[3] = 0
ROM[4] = 0

--Configure T7's 1-wire settings
MB.W(5300, 0, SensorPinNum)	    --ONEWIRE_DQ_DIONUM data line (DQ)
MB.W(5307, 0, 51)	              --ONEWIRE_FUNCTION set to 51=Read, 240=Search

--For this to work properly only one device may be connected to the bus.
MB.W(5310, 0, 1)                --ONEWIRE_GO, read the ID of the sensor. 

ROM, error = MB.RA(5328, 0, 4)  --ONEWIRE_SEARCH_RESULT

print("MW:", ROM[1],"UW:", ROM[2],"HW:", ROM[3],"LW:", ROM[4])
--Write down these 4 numbers so that you can directly address this sensor later.
--See the "DS18B20 Temperature (1-Wire)" sensor example for details on acquiring a temperature reading