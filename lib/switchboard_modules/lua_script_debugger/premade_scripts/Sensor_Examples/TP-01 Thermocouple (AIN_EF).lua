print("Grab the temperature from a TP-01 thermocouple.")
--The voltage output from the thermocouple is automatically converted into degK
--by the T7s AIN Extended Feature for thermocouples.
--http://labjack.com/support/datasheets/t7/ain/extended-features
--The cold junction compensation is automatically handled by the T7's integrated
--temperature sensor, and calculations performed by firmware.

--The TP-01 is a type K thermocouple, which is very affordable on Amazon
--http://www.amazon.com/Type-Thermocouple-Thermometer-Sensor-TP01/dp/B0087ZR81O
--It's a bit awkward to connect to the screw terminals of a T7, for this example
--it was necessary to reshape the prongs with some pliers.

--Configure the T7 -------------------------------------------------------------
TempK = 0           --Thermocouple is wired to AIN1 and GND
TempF = 0

MB.W(48005, 0, 1)   --ensure analog system is powered on
MB.W(9002, 1, 22)   --AIN1_EF_INDEX set to 22 (type K)
MB.W(40002, 3, 0.1) --AIN1_RANGE set to ±0.1V
MB.W(41501, 0, 0)   --AIN1_RESOLUTION_INDEX set to 0 (auto)
MB.W(9302, 1, 0)    --set AIN1_EF_CONFIG_A to deg K (1=degC, 2=degF)

LJ.IntervalConfig(0, 1000)          --set interval to 1000ms

while true do
  if LJ.CheckInterval(0) then       --interval completed
    TempK = MB.R(7002, 3)           --AIN1_EF_READ_A, the temperature in Kelvin
    print("Temperature: ", TempK, "K")
    TempF = (TempK * 1.8) - 459.67
    print ("Temperature:", TempF, "°F\n")
  end
end