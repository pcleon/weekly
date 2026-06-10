import urllib.request
import json
req = urllib.request.Request("http://localhost:8000/api/pages/reports")
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode())
    print(json.dumps(data, indent=2, ensure_ascii=False))
