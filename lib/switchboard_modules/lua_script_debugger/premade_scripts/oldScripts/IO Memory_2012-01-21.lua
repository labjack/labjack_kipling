This example will enable 16 floats for memory that can be read through modbus. When a program writes to the IO mem write area the register addresses and values will be read via IOMEM.R(). The values will be increased by 5 and saved to the IO mem read area. The new values can now be read through modbus.

This can be diffult to test. While LUA_Simple_PoC is running nothing else can talk to the T7 over USB. The application sending data to the IO memory will need to communcate over Ethernet. LUA_Simple_PoC will be updated to allow IO memory operations directly from it.


count = 0
LJ.IntervalConfig(0, 10)
while true do
  if LJ.CheckInterval(0) then
    a, v = IOMEM.R()
    if a ~= 0 then
      print("Register write detected: ", a, v)
      MB.W(a-1000, v+5)
    end
  end
end