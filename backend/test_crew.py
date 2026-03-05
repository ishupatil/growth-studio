import json
from crew import run_growth_crew

data = {
    'username': 'nature.resin.art',
    'followers': 1200,
    'avg_likes': 45,
    'avg_comments': 3,
    'posting_frequency': '3 times a week',
    'content_type': 'Resin art process and nature aesthetic videos',
    'brand_tone': 'Calming, mysterious, aesthetic',
    'goal': 'going viral and building community',
    'target_followers': 10000
}

result = run_growth_crew(data)

with open('sample_output.json', 'w') as f:
    json.dump(result, f, indent=4)
