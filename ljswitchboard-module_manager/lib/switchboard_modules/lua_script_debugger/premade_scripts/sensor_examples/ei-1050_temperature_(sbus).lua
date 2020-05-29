--[[
    Name: ei-1050_temperature_(sbus).lua
    Desc: This is an example reads data from an EI-1050 digital temperature
            and humidity probe
    Note: The EI-1050 includes a SHT-11 temperature/humidity sensor by Sensiron
          (SBUS). Sensibus (SBUS) is a proprietary communication protocol used
          by the SHT11, SHT15, SHT71, and SHT75.

          Multiple sensors could share clock & data lines, but you would
          need to begin using the enable wire

          The T7 has SBUS functionality integrated which handles sensibus comm
          For more T7 information see:
            http://labjack.com/support/datasheets/t7/digital-io/sbus
          For more on the EI-1050 see:
            http://labjack.com/support/ei-1050/datasheet
--]]

--WIRES
--Red Wire (Power) FIO2 (FIO6 on T4) set to output high
--Black Wire (GND) GND
--Green Wire (Data) FIO0 (FIO4 on T4)
--White Wire (Clock) FIO1  (FIO5 on T4)
--Brown Wire (Enable) N/C

print("Communicate with an EI-1050 digital temperature and humidity probe")
local tempk = 0
local tempf = 0
local rh = 0

--Configure T7s SPI pins
devtype = MB.readName("PRODUCT_ID")
-- If using a T7
if devtype == 7 then
  -- Use FIO2 for power
	MB.writeName("SBUS_ALL_POWER_DIONUM", 2)
  -- Use FIO0 for Data
	MB.writeName("SBUS0_DATA_DIONUM", 0)
  -- Use FIO1 for Clock
	MB.writeName("SBUS0_CLOCK_DIONUM", 1)
  -- If using a T4
elseif devtype == 4 then
  -- Use FIO6 for power
  MB.writeName("SBUS_ALL_POWER_DIONUM", 6)
  -- Use FIO4 for Data
  MB.writeName("SBUS0_DATA_DIONUM", 4)
  -- Use FIO5 for Clock
  MB.writeName("SBUS0_CLOCK_DIONUM", 5)
end
-- Configure a 2000ms interval
LJ.IntervalConfig(0, 2000)

while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    tempk = MB.readName("SBUS0_TEMP")
  	tempf = (tempk - 273.15) * 1.8000 + 32.00
  	rh = MB.readName("SBUS0_RH")
    print ("Temperature is:", tempf, "°F", "Relative Humidity is: ", rh, "%RH")
  end
end