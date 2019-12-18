--[[
    Name: tp-01_thermocouple_(ain_ef).lua
    Desc: This example shows how to get temp readings from a TP-01 thermocouple
    Note: Connect the thermocouple leads between AIN1 and GND

          The voltage output from the thermocouple is automatically converted
          into degK by the T7s AIN Extended Feature for thermocouples

          The cold junction compensation is automatically handled by the T7s
          integrated temperature sensor, and calculations performed by firmware

          For more information see the T7 AIN_EF datasheet page:
            http://labjack.com/support/datasheets/t7/ain/extended-features

          The TP-01 is a type K thermocouple, which is very affordable on Amazon:
            http://www.amazon.com/Type-Thermocouple-Thermometer-Sensor-TP01/dp/B0087ZR81O
--]]

print("Grab the temperature from a TP-01 thermocouple.")
-- Disable truncation warnings (truncation should not be a problem in this script)
MB.writeName("LUA_NO_WARN_TRUNCATION", 1)
-- Check that this is a T7
local devtype = MB.readName("PRODUCT_ID")
if devtype == 4 then
	print("This script is compatable only with T7 devices. Check T4 documentation for Thermocouple capability.")
  MB.writeName("LUA_RUN", 0)
end

-- Ensure analog system is powered on
MB.writeName("POWER_AIN", 1)
-- AIN1_EF_INDEX set to 22 (type K)
MB.writeName("AIN1_EF_INDEX", 22)
-- Use the ±0.1V AIN1 range
MB.writeName("AIN1_RANGE", 0.1)
-- Set the AIN resolution index to 0 (auto)
MB.writeName("AIN1_RESOLUTION_INDEX", 0)
-- Set AIN1_EF_CONFIG_A to deg K (1=degC, 2=degF)
MB.writeName("AIN1_EF_CONFIG_A", 0)
-- Configure a 1000ms interval
LJ.IntervalConfig(0, 1000)

while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    -- Get the temperature in Kelvin
    local tempk = MB.readName("AIN1_EF_READ_A")
    print("Temperature: ", tempk, "K")
    local tempf = (tempk * 1.8) - 459.67
    print ("Temperature:", tempf, "°F\n")
  end
end