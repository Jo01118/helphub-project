import urllib.request, json
req = urllib.request.Request('http://127.0.0.1:8000/api/auth/login/', data=json.dumps({'username':'jo','password':'jo'}).encode(), headers={'Content-Type':'application/json'})
access = json.loads(urllib.request.urlopen(req).read())['access']
req2 = urllib.request.Request('http://127.0.0.1:8000/api/reports/', headers={'Authorization': 'Bearer ' + access})
try:
    print(urllib.request.urlopen(req2).read().decode())
except Exception as e:
    print(e.read().decode())
