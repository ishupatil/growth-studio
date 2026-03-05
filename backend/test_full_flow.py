from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

profile_data = {
    "username": "nature_tester_supa1",
    "followers": 1500,
    "avg_likes": 50,
    "avg_comments": 4,
    "posting_frequency": "5 times a week",
    "content_type": "Daily aesthetic resin art videos",
    "brand_tone": "Calming and energetic",
    "goal": "Gain 500 followers this week",
    "target_followers": 2000
}

feedback_data = {
    "username": "nature_tester_supa1",
    "followers_gained": 120,
    "best_post": "The blue ocean resin pour",
    "engagement_change": "Likes went up 20% but comments stayed the same"
}

print("Running test...")

# 1. Run generation (First time, no feedback)
print("1. Generating initial plan...")
response1 = client.post("/api/generate", json=profile_data)
print(f"Generate Response 1 Code: {response1.status_code}")

# 2. Add feedback
print("2. Submitting feedback from week 1...")
response2 = client.post("/api/feedback", json=feedback_data)
print(f"Feedback Response: {response2.status_code}")

# 3. Run generation again (Second time, with feedback)
print("3. Generating adapted plan for week 2...")
response3 = client.post("/api/generate", json=profile_data)
print(f"Generate Response 2 Code: {response3.status_code}")
