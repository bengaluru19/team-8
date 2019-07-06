import urllib.request
from requests import get
import json

#google-API-Key -> AIzaSyAgiYh1PGNnVHMC6Exu4FO2U6xCkA3bxUM


#ip
ip = get('https://api.ipify.org').text

#data
data = json.loads(urllib.request.urlopen('http://api.ipstack.com/'+ip+'?access_key=268dffcb68449743e40648437175e0be').read().decode('utf-8'))
print(data["country_code"])
