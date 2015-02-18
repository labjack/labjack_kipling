print("Read and display the device temperature 10 times at 0.5 Hz.")
count = 0
MB.W(48005, 0, 1)        --Ensure analog is on
MB.W(43990, 0, 1) 
LJ.IntervalConfig(0, 500)
while true do
  if LJ.CheckInterval(0) then
    MB.W(2020, 0, 1) 
    temp = MB.R(60050,3)
    print(temp, "K")
    count = count + 1
    MB.W(2020, 0, 0)
  end
end