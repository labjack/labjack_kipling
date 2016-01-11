print("Enable the high speed counter on CIO0")
print("Please attach a jumper wire between EIO0 and CIO0")
count = 0
eioState = 0

-- Enable CounterA on DIO16/CIO0
MB.W(44032, 1, 0) -- disable the DIO16_EF_ENABLE
MB.W(44132, 1, 7) -- Configure to be a high speed counter DIO16_EF_INDEX
MB.W(44032, 1, 1) -- enable the DIO16_EF_ENABLE

-- configure EIO state
MB.W(2008, 0, eioState)

LJ.IntervalConfig(0, 500)      --set interval to 1000 for 1000ms

-- Allow user to configure whether or not a read and reset or just a read is
-- performed.
clearCount = true

while true do
  if eioState==1 then
    eioState = 0
  else
    eioState = 1
  end
  MB.W(2008, 0, eioState)
  
  if LJ.CheckInterval(0) then   --interval completed
    if clearCount then
      -- Read DIO16_EF_READ_A_AND_RESET to return the current count & reset the value
      count = MB.R(3132, 1)
    else
      -- read DIO16_EF_READ_A to return the current count
      count = MB.R(3032, 1)
    end
    print("Current Count", count)
  end
end