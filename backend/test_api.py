import urllib.request
import json

data = json.dumps({
    "nitrogen": 85,
    "phosphorus": 55,
    "potassium": 48,
    "ph": 6.2,
    "rainfall": 720,
    "temperature": 22,
    "humidity": 68,
    "soil_type": "loamy",
    "season": "long_rains",
    "region": "highland",
    "irrigation": 0,
    "language": "en"
}).encode()

req = urllib.request.Request(
    "http://localhost:8000/api/crops/recommend",
    data=data,
    headers={"Content-Type": "application/json"},
    method="POST"
)

with urllib.request.urlopen(req) as resp:
    result = json.loads(resp.read())

print("Top crop     :", result["top_crop"])
print("Drought risk :", result["drought_risk"])
print("Soil score   :", result["soil_fertility_score"])
print()
print("Recommendations:")
for r in result["recommendations"]:
    print(f"  #{r['rank']} {r['crop']:<18} {r['confidence_pct']:>5}  [{r['confidence_label']}]")
print()
print("AI Explanation:")
print(" ", result["explanation"])
print()
print("Farmer Tips:")
for tip in result["tips"]:
    print(" -", tip)
print()
print("Climate Warning:")
print(" ", result["climate_warning"])