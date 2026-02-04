import requests

url = "https://friendly-finch-619.convex.cloud/api/run/files.js/generateUploadUrl"
headers = {"accept": "application/json", "Content-Type": "application/json"}
payload = {"args": {}, "format": "json"}

response = requests.post(url, headers=headers, json=payload)  # ✅ POST + json=
print(response.status_code)
print(response.text)
