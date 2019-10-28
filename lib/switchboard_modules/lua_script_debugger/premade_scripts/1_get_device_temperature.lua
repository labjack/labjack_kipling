--[[
    Name: 1_get_device_temperature.lua
    Desc: This example shows how to read the internal device temperature
    Note: This example requires firmware 1.0282 (T7) or 1.0023 (T4)
--]]

------------------------------------------
-- Desc: Converts Kelvin to Fahrenheit
------------------------------------------
local function convert_k_to_f(degk)
  local degf = (degk - 273.15) * 1.8000 + 32.00
  return degf
end

print("Read and display the device temperature at 0.5 Hz.")
-- Write 1 to the POWER_AIN register to ensure the analog input module is on
MB.writeName("POWER_AIN", 1)

-- Configure an interval of 500ms
LJ.IntervalConfig(0, 500)
-- Run the program in an infinite loop
while true do
    -- If an interval is done
  if LJ.CheckInterval(0) then
    -- Get the temperature in K from the TEMPERATURE_DEVICE_K register
    local tempk = MB.readName("TEMPERATURE_DEVICE_K")
    local tempf = convert_k_to_f(tempk)
    print(tempf, "°F")
  end
end