print("T4 Basic I/O Example")

-- This is a basic lua script example that interacts with analog and digital I/O
-- on the T4 once per second.  During initialization, all of the flexible I/O
-- lines get configured as digital I/O.  Once running, twice per second, an
-- analog value is read from AIN0 and written to DAC0.  FIO4 is read and its
-- state is written to FIO5.

-- If we are not running on a T4, stop the script.
devType = MB.R(60000, 3)
if devType ~= 4 then
	print("Device is not a T4")
	MB.W(6000, 1, 0);
end

-- Configure flexible I/O lines as digital inputs and outputs.
print('Val:', 0x0F0)
MB.W(2880, 1, 0x000)

-- Set up a 0.5 second timer
LJ.IntervalConfig(0, 1000)

-- define used variables.
ainVal = 0
dacVal = 0
dioState = 0

-- Enter a permanent while loop
while true do
	if LJ.CheckInterval(0) then -- Interval completed.
		-- Read AIN0
		ainVal = MB.R(0, 3)
		
		-- Make sure the AIN0 value is between 0V and 5V
		dacVal = ainVal
		if(ainVal > 5) then
		  dacVal = 5
		end
		if(ainVal < 0) then
		  dacVal = 0
		end
		
		-- Write the AIN0 value to DAC0.
		MB.W(1000, 3, dacVal)

		-- Read FIO4 and write to FIO5
		dioState = MB.R(2004, 0)
		MB.W(2005, 0, dioState)
		
		print('Set DAC0 to:', dacVal)
    		print('Set FIO5 to:', dioState)
    		print('') -- Print a new-line
	end
end

