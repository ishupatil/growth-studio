import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from crew import run_growth_crew
from supabase import create_client, Client
from dotenv import load_dotenv
from instagram import fetch_public_profile
from scheduler import start_scheduler
import socket

# ISP DNS bypass for blocked Supabase domain
original_getaddrinfo = socket.getaddrinfo

def patched_getaddrinfo(*args, **kwargs):
    if args[0] and 'supabase.co' in str(args[0]):
        try:
            return original_getaddrinfo(*args, **kwargs)
        except Exception:
            pass
    return original_getaddrinfo(*args, **kwargs)

socket.getaddrinfo = patched_getaddrinfo

load_dotenv()

app = FastAPI(title="Growth Studio API")

# Start the weekly auto-scheduler in background
_scheduler = start_scheduler()

# Scheduler status endpoint
@app.get("/api/scheduler/status")
def scheduler_status():
    jobs = _scheduler.get_jobs()
    return {
        "running": _scheduler.running,
        "jobs": [{"id": j.id, "name": j.name, "next_run": str(j.next_run_time)} for j in jobs]
    }

# Setup Supabase client
url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

if url and key:
    supabase: Client = create_client(url, key)
else:
    raise RuntimeError("SUPABASE_URL and SUPABASE_KEY missing from .env")

# Allow React frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "https://growth-studio-qavh.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth Helper ──────────────────────────────────────────────────────────────

async def get_auth_user_id(request: Request) -> Optional[str]:
    """Extract and verify the Supabase JWT, return the auth user's UUID or None."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    try:
        resp = supabase.auth.get_user(token)
        return str(resp.user.id) if resp.user else None
    except Exception:
        return None

# ── Pydantic Models ───────────────────────────────────────────────────────────

class ProfileInput(BaseModel):
    username: str
    followers: int
    avg_likes: int
    avg_comments: int
    posting_frequency: str
    content_type: str
    brand_tone: str
    goal: str
    target_followers: int
    competitor_username: Optional[str] = ""

class FeedbackInput(BaseModel):
    username: str
    followers_gained: int
    best_post: str
    engagement_change: str
    caption_style_used: Optional[str] = ""
    caption_result: Optional[str] = ""

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/api/instagram-profile")
async def get_instagram_profile(username: str):
    """Fetch public Instagram profile stats for auto-fill."""
    if not username or len(username) < 2:
        raise HTTPException(status_code=400, detail="Invalid username")
    clean_username = username.lstrip("@").strip()
    result = fetch_public_profile(clean_username)
    
    # If Instaloader is blocked (401/rate limit on Render's servers),
    # return a 503 so the frontend shows "Could not fetch — fill manually"
    if result and "error" in result:
        print(f"Instaloader failed for {clean_username}: {result['error']}")
        raise HTTPException(
            status_code=503,
            detail="Instagram auto-fill unavailable. Please fill in your stats manually."
        )
        
    return result


@app.post("/api/generate")
async def generate_growth_plan(profile: ProfileInput, request: Request):
    try:
        auth_user_id = await get_auth_user_id(request)
        data = profile.model_dump()
        username = data["username"]

        upsert_payload = {
            "username": username,
            "followers": data["followers"],
            "avg_likes": data["avg_likes"],
            "avg_comments": data["avg_comments"],
            "posting_frequency": data["posting_frequency"],
            "content_type": data["content_type"],
            "brand_tone": data["brand_tone"],
            "goal": data["goal"],
            "target_followers": data["target_followers"]
        }
        if auth_user_id:
            upsert_payload["auth_user_id"] = auth_user_id
            
            # Unlink previous profile tied to this auth_user_id if the username is different
            existing = supabase.table("user_profiles").select("username").eq("auth_user_id", auth_user_id).execute()
            if existing.data and existing.data[0]["username"] != username:
                supabase.table("user_profiles").update({"auth_user_id": None}).eq("auth_user_id", auth_user_id).execute()

            # Now safely upsert on username
            supabase.table("user_profiles").upsert(upsert_payload, on_conflict="username").execute()
        else:
            supabase.table("user_profiles").upsert(upsert_payload, on_conflict="username").execute()

        # 2. Get user ID
        fetched_user = supabase.table("user_profiles").select("id").eq("username", username).execute()
        user_id = fetched_user.data[0]["id"] if fetched_user.data else None

        # 3. Fetch latest feedback (performance + caption)
        feedback_data = None
        if user_id:
            recent_feedback = supabase.table("performance_feedback") \
                .select("*").eq("profile_id", user_id).order("id", desc=True).limit(1).execute()
            if recent_feedback.data:
                latest = recent_feedback.data[0]
                feedback_data = {
                    "followers_gained": latest.get("followers_gained"),
                    "best_post": latest.get("best_post"),
                    "engagement_change": latest.get("engagement_change"),
                    "caption_style_used": latest.get("caption_style_used", ""),
                    "caption_result": latest.get("caption_result", ""),
                }

        # 4. Generate Strategy via CrewAI
        result = run_growth_crew(data, feedback_data=feedback_data)

        # 5. Insert Weekly Plan into Supabase
        if user_id:
            supabase.table("weekly_plans").insert({
                "profile_id": user_id,
                "engagement_rate": result.get("engagement_rate"),
                "audit_report": result.get("audit_report"),
                "strategy_plan": result.get("strategy_plan"),
                "content_ideas": result.get("content_ideas"),
                "captions": result.get("captions"),
                "competitor_analysis": result.get("competitor_analysis"),
                "posting_schedule": result.get("posting_schedule"),
            }).execute()

        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/feedback")
async def submit_feedback(feedback: FeedbackInput):
    try:
        fetched_user = supabase.table("user_profiles").select("id").eq("username", feedback.username).execute()
        if not fetched_user.data:
            raise HTTPException(status_code=404, detail="User not found in Supabase")
        user_id = fetched_user.data[0]["id"]

        supabase.table("performance_feedback").insert({
            "profile_id": user_id,
            "followers_gained": feedback.followers_gained,
            "best_post": feedback.best_post,
            "engagement_change": feedback.engagement_change,
            "caption_style_used": feedback.caption_style_used or "",
            "caption_result": feedback.caption_result or "",
        }).execute()

        return {"success": True, "message": "Feedback saved to Supabase successfully."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/caption-feedback")
async def caption_feedback(payload: dict):
    """Quick endpoint to record which caption a user clicked on."""
    try:
        username = payload.get("username")
        caption_style = payload.get("caption_style", "")
        result = payload.get("result", "")  # "worked" | "flopped" | "unused"

        if not username:
            raise HTTPException(status_code=400, detail="username required")

        fetched_user = supabase.table("user_profiles").select("id").eq("username", username).execute()
        if not fetched_user.data:
            raise HTTPException(status_code=404, detail="User not found")
        user_id = fetched_user.data[0]["id"]

        # Update the most recent feedback row or insert a new lightweight one
        recent = supabase.table("performance_feedback").select("id") \
            .eq("profile_id", user_id).order("id", desc=True).limit(1).execute()

        if recent.data:
            supabase.table("performance_feedback").update({
                "caption_style_used": caption_style,
                "caption_result": result,
            }).eq("id", recent.data[0]["id"]).execute()
        else:
            supabase.table("performance_feedback").insert({
                "profile_id": user_id,
                "followers_gained": 0,
                "best_post": "",
                "engagement_change": "",
                "caption_style_used": caption_style,
                "caption_result": result,
            }).execute()

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/progress")
async def get_progress(username: str):
    """Returns week-over-week data for the Progress Dashboard."""
    try:
        fetched_user = supabase.table("user_profiles").select("id, followers, target_followers").eq("username", username).execute()
        if not fetched_user.data:
            raise HTTPException(status_code=404, detail="User not found")
        user_id = fetched_user.data[0]["id"]

        # Get all weekly plans ordered by date
        plans = supabase.table("weekly_plans") \
            .select("id, engagement_rate, created_at") \
            .eq("profile_id", user_id) \
            .order("created_at", desc=False) \
            .execute()

        # Get all feedback ordered by date
        feedbacks = supabase.table("performance_feedback") \
            .select("followers_gained, engagement_change, caption_style_used, caption_result, created_at") \
            .eq("profile_id", user_id) \
            .order("created_at", desc=False) \
            .execute()

        return {
            "success": True,
            "username": username,
            "profile": fetched_user.data[0],
            "weekly_plans": plans.data,
            "feedbacks": feedbacks.data,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "Growth Studio API connected to Supabase is running"}
