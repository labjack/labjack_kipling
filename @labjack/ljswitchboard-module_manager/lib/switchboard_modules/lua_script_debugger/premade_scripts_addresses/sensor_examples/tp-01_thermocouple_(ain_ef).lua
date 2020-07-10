print("Grab the temperature from a TP-01 thermocouple.")
--The voltage output from the thermocouple is automatically converted into degK
--by the T7s AIN Extended Feature for thermocouples.
--https://labjack.com/support/datasheets/t7/ain/extended-features
--The cold junction compensation is automatically handled by the T7s integrated
--temperature sensor, and calculations performed by firmware.

--The TP-01 is a type K thermocouple, which is very affordable on Amazon
--http://www.amazon.com/Type-Thermocouple-Thermometer-Sensor-TP01/dp/B0087ZR81O
--It is a bit awkward to connect to the screw terminals of a T7, for this example
--it was necessary to reshape the prongs with some pliers.

local mbRead=MB.R			--local functions for faster processing
local mbWrite=MB.W

devType = MB.R(60000, 3)--Check that this is a T7
if devType == 4 then
	print("This script is compatable only with T7 devices. Check T4 documentation for Thermocouple capability.")
end

--Configure the T7 -------------------------------------------------------------
local TempK = 0           --Thermocouple is wired to AIN1 and GND
local TempF = 0

mbWrite(48005, 0, 1)   --ensure analog system is powered on
mbWrite(9002, 1, 22)   --AIN1_EF_INDEX set to 22 (type K)
mbWrite(40002, 3, 0.1) --AIN1_RANGE set to ±0.1V
mbWrite(41501, 0, 0)   --AIN1_RESOLUTION_INDEX set to 0 (auto)
mbWrite(9302, 1, 0)    --set AIN1_EF_CONFIG_A to deg K (1=degC, 2=degF)

LJ.IntervalConfig(0, 1000)          --set interval to 1000ms
local checkInterval=LJ.CheckInterval
while true do
  if checkInterval(0) then       --interval completed
    TempK = mbRead(7002, 3)           --AIN1_EF_READ_A, the temperature in Kelvin
    print("Temperature: ", TempK, "K")
    TempF = (TempK * 1.8) - 459.67
    print ("Temperature:", TempF, "°F\n")
  end
end