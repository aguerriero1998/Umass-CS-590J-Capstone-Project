import requests
r = requests.get('http://localhost:80/index.html')
print(r.text)