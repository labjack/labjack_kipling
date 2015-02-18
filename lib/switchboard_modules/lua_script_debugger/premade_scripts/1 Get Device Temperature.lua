print("Read and display the device temperature at 0.5 Hz.")
tempK = 0
tempF = 0

MB.W(48005, 0, 1)                   --Ensure analog is on

LJ.IntervalConfig(0, 500)           --Configure interval

function ConvertToF(degK)
  local degF = 0
  degF = (degK - 273.15) * 1.8000 + 32.00
  return degF
end

while true do
  if LJ.CheckInterval(0) then     --interval finished
    tempK = MB.R(60052, 3)       --read address 60052 TEMPERATURE_DEVICE_K, type is 3
    tempF = ConvertToF(tempK)
    print(tempF, "°F")
  end
end