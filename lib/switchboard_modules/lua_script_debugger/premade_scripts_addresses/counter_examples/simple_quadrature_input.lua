--Title: quadrature_input_large_integers.lua
--Purpose: This is a simple example of how to read quadrature input data.

--Note: Could modify with the DIO0_EF_READ_AF register for float mode
--Note: Does not take into effect counter-clockwise revolutions or two''s complement conversion
print("simple_quadrature_input.lua")
print("Note: This script only supports 23-bit counts.")

devType = MB.R(60000, 3)
efReadAReg = 0
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
end

LJ.IntervalConfig(0, 500) --Update data every half second

while true do
  --Can take out CheckInterval or make very low for ~continuous data polling
  if LJ.CheckInterval(0) then
    counts = MB.R(efReadAReg, 1)--Read DIO0_EF_READ_A register

    if(math.abs(counts) > 2^23) then
      print("Quadrature count precision loss detected")
      print("Use the 'Quadrature Input Large Integers' script for more accurate tracking of large integers")
    end

    --Save the number of counts to USER_RAM0_U32 and USER_RAM1_U32
    MB.W(46100,1,counts)
  end
end
