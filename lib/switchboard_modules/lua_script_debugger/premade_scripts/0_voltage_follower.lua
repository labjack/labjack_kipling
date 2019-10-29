--[[
    Name: 0_voltage_follower.lua
    Desc: Example showing how to read the internal device temperature
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
local t7minfirmware = 1.0282
local t4minfirmware = 1.0023
-- Read the firmware version
local fwversion = MB.R(60004, 3)
-- The PRODUCT_ID register holds the device type
local devtype = MB.R(60000, 3)
if devtype == 4 then
  -- If using a T4 and the firmware does not meet the minimum requirement
  if fwversion < t4minfirmware then
    print("Error: this example requires firmware version", t4minfirmware, "or higher on the T4")
    print("Stopping the script")
    -- Writing a 0 to LUA_RUN stops the script
    MB.W(6000, 1, 0)
  end
elseif devtype == 7 then
  -- If using a T7 and the firmware does not meet the minimum requirement
  if fwversion < t7minfirmware then
    print("Error: this example requires firmware version", t7minfirmware, "or higher on the T7")
    print("Stopping the script")
    -- Writing a 0 to LUA_RUN stops the script
    MB.W(6000, 1, 0)
  end
end

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