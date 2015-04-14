--This is the list of LabJack-specific functions.  There are many more native Lua functions
--http://www.lua.org/manual/5.2/manual.html#3
--All LabJack addresses can be found in the Register Matrix(Modbus Map)
--http://labjack.com/support/modbus/map
--For more information, see the scripting section in the T7 datasheet
--http://labjack.com/support/datasheets/t7/scripting

--dataTypes

--0:	unsigned 16-bit integer
--1:	unsigned 32-bit integer
--2:	signed 32-bit integer
--3:	single precision floating point (float)
--98:	string
--99:	byte - The "byte" dataType is used to pass arrays of bytes, or tables.


--bitwise operations, see Lua 5.2 documentation
--http://www.lua.org/manual/5.2/manual.html#6.7
--bit.bor (x1, x2, ...)
--bit.lshift (x1, disp)
--bit.rshift (x1, disp)


--MB.R

--Value = MB.R(Address, dataType)  
--Description: Modbus read. Will read a single value from a modbus register. That item can be a u16, u32, a float or a string.


--MB.W

--MB.W(Address, dataType, value)
--Description: Modbus write. Writes a single value to a modbus register. The type can be a u16, u32, a float, or a string.


--MB.WA

--error = MB.WA(Address, dataType, nValues, table)
--Description: Modbus write array. Reads nValues from the supplied table, interprets them according to the dataType and 
--writes them as an array to the register specified by Address. The table must be indexed with numbers from 1 to nValues.


--MB.RA

--table, error = MB.RA(Address, dataType, nValues)
--Description: Modbus read array. Reads nValues of type dataType from Address and returns the results in a Lua table. 
--The table must be indexed from 1 to nValues.


--LJ.ledtog

--LJ.ledtog()
--Description: Toggles status LED. This is just for testing and will be removed.

--LJ.DIO_D_W(IONum, direction)
--LJ.DIO_S_R(IONum, state)
--LJ.DIO_S_W(IONum, state)
--Description: Integrated digital IO interaction that can operate a bit faster than traditional MB.W, MB.R functions.
--These are beta functions, and may change in name or form.


--LJ.Tick

--Ticks = LJ.Tick()
--Description:  Reads the core timer. (1/2 core freq). Useful for timing events that happen irregularly, and/or very fast.
--Most timing related operations can be timed using one of the 8 available interval timers using LJ.IntervalConfig([0-7], time[ms])


--LJ.IntervalConfig & LJ.CheckInterval------------------------------------------

--IntervalConfig and CheckInterval work together to make an easy-to-use timing function.
--Set the desired interval time with IntervalConfig, then use CheckInterval to watch for timeouts. 
--The interval period will have some jitter but no overall error. Jitter is typically ±30 µs but can be greater depending on 
--processor loading. A small amount of error is induced when the processor's core speed is changed.
--Up to 8 different intervals can be active at a time.


--LJ.IntervalConfig(handle, time_ms)

--handle: 0-7 Specifies which of the 8 available timers to configure
--time_ms: Number of milliseconds per interval.
--Description: Set an interval for code execution. This function is included in almost all scripts

--LJ.CheckInterval(handle)

--handle: 0-7 Specifies which of the 8 available timers to check
--Returns: 1 if the interval has expired. 0 if not.
--Description: Check if the timer interval has expired. This function is included in almost all scripts

--EXAMPLE
LJ.IntervalConfig(0, 1000)

while true do

  if LJ.CheckInterval(0) then

    --Code to run once per second here.

  end

end
--end LJ.IntervalConfig & LJ.CheckInterval--------------------------------------


--LJ.setLuaThrottle

--LJ.setLuaThrottle(value)
--value: Number of Lua instructions to execute before releasing control to the normal polling loop.
--Description: Set the processor priority for the Lua script. After the normal polling loop 
--completes, Lua will be given processor time again.  This is an advanced function that is useful
--when Lua code is running on the device at the same time as a host computer is accessing it.

--LJ.getLuaThrottle

--value = LJ.getLuaThrottle()
--Reads a value that corresponds with the processor priority of the Lua script, see LJ.setLuaThrottle.



--LUA IO Memory-----------------------------------------------------------------

--LUA IO is a system that makes it easy for Lua scripts to make data available to external host computers,
--and conversely, external host computers can provide information for the Lua script.
--Before using IOMEM.R or IOMEM.W, it is necessary to specify the number of floats which should be 
--allocated in memory using modbus address 6006 "LUA_NUM_IO_FLOATS", which is dataType 1


--IOMEM.W

--IOMEM.W(Address, Value)
--Description: Lua writes to internal RAM, and instantly that data is available to external computers using modbus addresses 
--46000 to 46127 "LUA_IO#(0:127)_READ". 
--This feature makes it possible to handle processing complexity in a script, and run a simple polling application at the high level.
--Since it is merely a chunk of RAM, you may overwrite the values at any time.


--IOMEM.R

--Address, Value = IOMEM.R()
--Description: Reads from the FIFO a value written to the 47000 range. Address is zero if FIFO is empty.
--An external computer can send information to the Lua script using modbus addresses 47000 to 47127 "LUA_IO#(0:127)_WRITE". 
--External writes to these LUA_IO_WRITE registers are stored in a linked list. 
--The linked list is read as First-In-First-Out (FIFO) by the Lua script. 
--This prevents issues arising from write order and multiple writes to the same address. 
 

--EXAMPLE
MB.W(6006, 1, 10)       --allocate memory for 10 floats

while true do

  add, val = IOMEM.R()  --get a value from an external PC

  if add > 0 then

    print(string.format("New MB Write: %0.0f %f", add, val))

    IOMEM.W(add - 1000, val + 100)  --add 100 to the value, and write to 46000

  end

end
--end LUA IO Memory-------------------------------------------------------------