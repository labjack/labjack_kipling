--[[
    Name: ms-360lp_pir_motion_(logic).lua
    Desc: This example shows how to get readings from a MS-360LP PIR motion sensor
    Note: Wire ambient light sensor (ALS) output to an analog input, AIN0,
          with the desired pull-down resistor (10kΩ)

          Wire the motion sensor output (PIR) output to a digital I/O, FIO2

          For more information see the MS-360LP datasheet:
            https://www.irtec.com/tw-irt/upload_files/DS-MS360LP-EN-A4_V5.pdf
--]]


print("Get reading from a MS-360LP PIR motion sensor.  Sensor output is digital logic, and analog voltage.")
-- Assume the device being used is a T7, use FIO2 for the DIO motion pin
local inpin = "FIO2"
local devtype = MB.readName("PRODUCT_ID")
-- If actually using a T4
if devtype == 4 then
  -- Use FIO4 for the DIO motion pin
	inpin = "FIO4"
end
-- Configure a 1000ms interval
LJ.IntervalConfig(0, 1000)

while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    local vin = MB.readName("AIN0")
    print("Ambient light, AIN1: ", vin, "V")
    -- Convert_voltage_to_lux(vin) function not implemented
    local nomotion = MB.readName(inpin)
    if nomotion == 0 then
      -- Put motion response code here
      print("Motion Detected!")
    end
  end
end