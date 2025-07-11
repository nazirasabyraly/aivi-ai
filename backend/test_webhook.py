import requests
r = requests.get(
    "https://ipv4.webshare.io/",
    proxies={
        "http": "http://ujaoszjw-rotate:573z5xhtgbci@p.webshare.io:80/",
        "https": "http://ujaoszjw-rotate:573z5xhtgbci@p.webshare.io:80/"
    }
).text
print(r)