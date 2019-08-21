--Title: quadrature_input_large_integers.lua
--Purpose: Program for handling quadrature input counts that overflow 32 bit floats by 
-- tracking and reporting counts in two registers.

--Note: Could modify with the DIO0_EF_READ_AF register for float mode
--Note: Does not take into effect counter-clockwise revolutions or two's complement conversion
print("quadrature_input_large_integers.lua")

devType = MB.R(60000, 3)
efReadAReg = 0
efReadAAndResetReg = 0
if(devType == 7) then
  print("T7: Enabling quadrature input on DIO0 and DIO1")
  --Formatting for quadrature input
  MB.W(44000, 1, 0) --disable DIO0
  MB.W(44002, 1, 0) --disable DIO1
  MB.W(44100, 1, 10) --set DIO0 index
  MB.W(44102, 1, 10) --set DIO1 index
  MB.W(44000, 1, 1) --enable DIO0 for phase A
  MB.W(44002, 1, 1) --enable DIO1 for phase B
  efReadAReg = 3000
  efReadAAndResetReg = 3100
else if(devType == 4) then
  print("T4: Enabling quadrature input on DIO4 and DIO5")
  --Formatting for quadrature input
  MB.W(44008, 1, 0) --disable DIO0
  MB.W(44010, 1, 0) --disable DIO1
  MB.W(44108, 1, 10) --set DIO0 index
  MB.W(44110, 1, 10) --set DIO1 index
  MB.W(44008, 1, 1) --enable DIO0 for phase A
  MB.W(44010, 1, 1) --enable DIO1 for phase B
  efReadAReg = 3008
  efReadAAndResetReg = 3108
end

LJ.IntervalConfig(0, 500) --Update data every half second

newcount = 0      --Number used to store the new value polled from the LabJack register
lownum = 0        --Number used to keep the higher precision lower 22 bits of the number
residual = 0      --Number used to store the residual number of counts after conversion
multiplier = 0    --Number used to store how many multiples of 2^22 have been reached

while true do
  --Can take out CheckInterval or make very low for ~continuous data polling
  if LJ.CheckInterval(0) then
    lownum = MB.R(efReadAReg, 1) + residual --Read DIO0_EF_READ_A register & combine w/ any residual from last conversion

    --Once the register has a number of counts large enough that the precision could be comprimised, (greater than  22 bits)
    --convert by resetting the register and split it into separate values
    if (math.abs(lownum) >= 2^22) then
      lownum = MB.R(efReadAAndResetReg, 1) + residual --Read and reset DIO0_EF_READ_A register to zero
      if(math.abs(lownum) > 2^23) then
        print("Quadrature count precision loss detected")
      end
      multiplier = multiplier + math.floor(lownum/2^22) --save how many multiples of 2^22 of counts have occured
      residual = (lownum) % 2^22  --store number of residual counts
      lownum = residual           --Prepare to store residual
    end

    --Save the number of counts to USER_RAM0_U32 and USER_RAM1_U32
    MB.W(46100,1,lownum)
    MB.W(46102,1,multiplier)

    --Now, to get the full number of counts from an external application:
    -- counts = (2^22 * USER_RAM1_U32) + USER_RAM0_U32
    --USER_RAM1_U32 can now also be used as a boolean register to see weather an overflow (>=2^22) has occurred
  end
end
