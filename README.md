# Capstone
This is my capstone project for Umass CS 590J (Cyber Effects). The task of this capstone project was to create an end to end working cyber effect. 

My cyber effect leverages Chromium Issue 1710 and CVE-2019-2215 to gain remote code execution on a Google Pixel from a malicious phishing website. 

I spent most of my time working on the exploit and I spent a little time on the implant. The other members of my group developed the C2 server and the implant. 

The exploit has two stages as mentioned above. In the first stage we get remote code execution in the Chrome rendering process and in the second stage we run AARCH64 shellcode to get root and then download our implant and run it. The second stage shellcode is dynamically generate to allow configuring of IP address, ports and so forth. For more details look at "c2_server/template/payload.template" and "c2_server/gen_exploit.py".



