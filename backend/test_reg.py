import urllib.request, urllib.error, json
req = urllib.request.Request(
    'http://127.0.0.1:8000/api/auth/register/',
    data=json.dumps({
        'username': 'jo', 'password': 'jo', 'email': 'jo@example.com',
        'first_name': 'jo', 'phone': '123', 'city': 'jo', 'age': 20, 'role': 'USER'
    }).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
try:
    with urllib.request.urlopen(req) as f:
        print("Success:", f.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("Error:", e.read().decode('utf-8'))
except Exception as e:
    print("Error:", str(e))
