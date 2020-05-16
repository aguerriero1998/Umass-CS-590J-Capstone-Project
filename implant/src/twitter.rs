    
fn main() {
    let con_token = egg_mode::KeyPair::new("consumer key", "consumer secret");
    let request_token = egg_mode::request_token(&con_token, "oob").await.unwrap();
    let auth_url = egg_mode::authorize_url(&request_token);
    println!(auth_url);
}