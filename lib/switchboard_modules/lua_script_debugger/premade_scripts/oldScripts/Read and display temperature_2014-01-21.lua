The code below will enable the analog subsystem, then read and display the temperature every 500 ms. After 10 iterations the program will stop.

print("Read and display the device temperature 10 times at 0.5 Hz.")
count = 0
MB.W(48005, 0, 1)        --Ensure analog is on
LJ.IntervalConfig(0, 500)
while true do
  if LJ.CheckInterval(0) then
    temp = MB.R(60050,3)
    print(temp, "K")
    count = count + 1
  end
  if(count >= 10) then
    break
  end
end