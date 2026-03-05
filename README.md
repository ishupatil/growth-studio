# Growth Studio — Setup Guide

## 1. Get Your Free Groq API Key
Go to https://console.groq.com → Sign up free → Create API Key → Copy it

## 2. Backend Setup
```bash
cd backend
python -m venv venv
# Activate the virtual environment:
# On Windows: venv\Scripts\activate
# On macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
# Add your Groq key to .env:
# Edit the .env file with your key
uvicorn main:app --reload --port 8000
```

## 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 4. Open the App
Go to http://localhost:5173

## Model Used
- LLM: `llama-3.3-70b-versatile` via Groq (free tier, very fast)
- Framework: CrewAI sequential crew
