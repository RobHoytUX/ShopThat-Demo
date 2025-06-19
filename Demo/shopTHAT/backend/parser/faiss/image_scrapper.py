import requests
headers = {
    "User-Agent": "your real browser UA",
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://us.louisvuitton.com/",
    "Connection": "keep-alive",
    # Add any cookies if present
}
url= "https://us.louisvuitton.com/eng-us/homepage"
response = requests.get(url, headers=headers, timeout=30)
print(response.status_code)
