--This is an example that uses the SDP611 differential pressure sensor.

-- Check for device type and firmware version.
fwver = MB.readName("FIRMWARE_VERSION")
devType = MB.readName("PRODUCT_ID")
if (fwver < 1.0224 and devType == 7) or (fwver < 0.2037 and devType == 4) then
  print("This lua script requires a higher firmware version (T7 Requires 1.0224 or higher, T4 requires 0.2037 or higher). Program Stopping")
  MB.writeName("LUA_RUN", 0)
end

-- This function will convert the binary values from the SDP611 to a pressure. The binary
-- data consists of two bytes which must be joined and interpreted as 2''s complement. The
-- resulting signed binary value is then converted to pascals.
function binToPa(a,b)
  -- Join the two bytes
  local value = a*256+b  
  
  -- If value is negative, interpret as 2''s complement
  if value >0x8000 then
    value = bit.band(bit.bnot(value), 0xFFFF) +1
    value = value*-1
  end
  
  -- Convert to pascals
  value = value / 60  
  
  return value
end

-- 64 or h40, is default for SDP611 differential pressure sensor
local SLAVE_ADDRESS = 0x40

-- Configure the I2C Bus... SCL=12(EIO4) SDA=13(EIO5)
--NOTE: The T7 will not allow more than 1000 clock cycles of clock stretching. The SDP611 datasheet calls clock 
--stretching "master hold." The sensor needs to clock stretch for ~4.5ms. The clock needs to be ~20kHz or slower.
local SCL_DIO = 12
local SDA_DIO = 13
I2C.config(SCL_DIO, SDA_DIO, 65450, 0, SLAVE_ADDRESS, 0)

local rawT = {}

-- Sets timing interval to get pressure reading once per second.
LJ.IntervalConfig(0, 1000)
  while true do
    if LJ.CheckInterval(0) then
      -- Start I2C conversion
      rawT = I2C.write({0xF1})
      
      -- Account for master-hold condition
      LJ.DIO_D_W(SCL_DIO, 0)
      while LJ.DIO_S_R(SCL_DIO) == 0 do
      end
      LJ.DIO_D_W(SCL_DIO, 1)
      
      -- Read pressure value
      rawT = I2C.read(3)
      pressure = binToPa(rawT[1],rawT[2])
      
      -- Save value to USER_RAM register & print.
      MB.writeName('USER_RAM0_F32',pressure)
      print("pressure = ", pressure,"Pa")
    end
end
