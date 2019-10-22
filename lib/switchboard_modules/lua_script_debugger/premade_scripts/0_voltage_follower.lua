--[[
    Name: 0_voltage_follower.lua
    Desc: Example showing how to read the internal device temperature
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
MB.W(48005, 0, 1)

-- Configure an interval of 500ms
LJ.IntervalConfig(0, 500)
-- Run the program in an infinite loop
while true do
    -- If an interval is done
  if LJ.CheckInterval(0) then
    -- Read the TEMPERATURE_DEVICE_K register (type is 3)
    local tempk = MB.R(60052, 3)
    local tempf = convert_k_to_f(tempk)
    print(tempf, "°F")
  end
end