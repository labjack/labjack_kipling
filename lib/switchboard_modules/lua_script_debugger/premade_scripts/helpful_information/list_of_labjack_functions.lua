--Documentation updated for T7 firmware 1.0161 or newer, T4 firmware 1.0 or newer
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
--Description: Toggles status LED.  Note that reading AINs also toggles the status LED.

--LJ.DIO_D_W(IONum, direction)
--LJ.DIO_S_R(IONum, state)
--LJ.DIO_S_W(IONum, state)
--Description: Integrated digital IO interaction that can operate a bit faster than traditional MB.W, MB.R functions.
--These are beta functions, and may change in name or form.


--LJ.Tick

--Ticks = LJ.Tick()
--Description:  Reads the core timer. (1/2 core freq). Useful for timing events that happen irregularly, and/or very fast.
--Most timing related operations can be timed using one of the 8 available interval timers using LJ.IntervalConfig([0-7], time[ms])


--LJ.CheckFileFlag & LJ.ClearFileFlag

--LJ.CheckFileFlag and LJ.ClearFileFlag work together to provide an easy way to tell a Lua script to switch files.  
--This is useful for applications that require continuous logging in a Lua script, and on-demand file access from a host.
--Since files cannot be opened simultaneously by a Lua script and a host, the Lua script must first close the active file if the host wants
--to read file contents. The host writes a value of 1 to FILE_IO_LUA_SWITCH_FILE, and the Lua script is setup to poll this parameter
--using LJ.CheckFileFlag(). If the file flag is set, Lua code should switch files as shown in the example below.

--EXAMPLE
flag = LJ.CheckFileFlag() --poll the flag every few seconds
if flag == 1 then
  NumFn = NumFn + 1                --increment filename
  Filename = Filepre..string.format("%02d", NumFn)..Filesuf
  f:close()
  LJ.ClearFileFlag()              --inform host that previous file is available.
  f = io.open(Filename, "w")      --create or replace a new file
  print ("Command issued by host to create new file")
end


--LJ.IntervalConfig & LJ.CheckInterval------------------------------------------

--IntervalConfig and CheckInterval work together to make an easy-to-use timing function.
--Set the desired interval time with IntervalConfig, then use CheckInterval to watch for timeouts. 
--The interval period will have some jitter but no overall error. Jitter is typically ±30 µs but can be greater depending on 
--processor loading. A small amount of error is induced when the processors core speed is changed.
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



--User RAM (Formerly LUA IO Memory)----------------------------------------------

--User RAM is a system that makes it easy for Lua scripts to make data available to external host computers,
--and conversely, external host computers can provide information for the Lua script.

--WRITE
--MB.W(46000, Value)

--READ
--Value = MB.R(46000, 3)

--Description: Lua writes to internal RAM, and instantly that data is available to external computers using modbus addresses
--46000 to 46199. Access by name using "USER_RAM#(0:39)_F32", "USER_RAM#(0:9)_I32", "USER_RAM#(0:39)_U32", "USER_RAM#(0:19)_U16". 
--There are a total of 200 registers of pre-allocated RAM, which is split into several groups with different data types.
--This feature makes it possible to handle processing complexity in a script, and run a simple polling application at the high level.
--Since it is merely a chunk of RAM, you may overwrite the values at any time.

--USER_RAM EXAMPLE

enable = MB.R(46000, 3) --host may disable portion of the script with USER_RAM0_F32
if enable >= 1 then
  val = val + 1
  print("New value:", val)
  MB.W(46002, 3, val)  --provide a new value to host with USER_RAM1_F32
end

--User RAM FIFOs - ADVANCED-------------------------------------------------------

--There is also a more advanced system for passing data to/from a Lua script referred to as FIFO buffers. These buffers are useful
--for users who want to send an array of information in sequence to/from a Lua script. Usually 2 buffers are used for each endpoint, 
--one buffer dedicated for each communication direction (read and write). A host may write new data for the Lua script into FIFO0, 
--then once the script reads the data out of that buffer, it responds by writing data into FIFO1, and then the host may read the data 
--out of FIFO1.
 

--User RAM FIFO EXAMPLE

af32out= {}  --array of 5 values(floats)
af32in = {}
numvalsfio0 = 5
bytesperval = 4
fifo0bytes = numvalsfio0*bytesperval
MB.W(47900, 1, fifo0bytes) --allocate FIFO0 to 20 bytes

--write out to the host with FIFO0
for i=1, (numvalsfio0+1) do
  MB.W(47030, 3, af32out[i])  --provide a new array of 4 float values to host
end

--read in from the host with FIFO1
fifo1bytes = MB.R(47912, 1)
for i=1, ((fifo1bytes+1)/bytesperval) do
  af32in[i] = MB.R(47032, 3)
end

--end User RAM discussion-------------------------------------------------------------