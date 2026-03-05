"""
Weekly plan auto-scheduler.
Runs every Monday at 9:00 AM and auto-generates growth plans for all registered users.
"""
import os
import logging
from datetime import datetime
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from supabase import create_client

load_dotenv()
log = logging.getLogger("growth_scheduler")

def run_weekly_plans():
    """Auto-generate weekly plans for all users who have profiles."""
    log.info(f"[Scheduler] Auto-generation triggered at {datetime.now()}")
    try:
        from crew import run_growth_crew  # lazy import to avoid circular
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        sb  = create_client(url, key)

        # Fetch all profiles
        profiles_resp = sb.table("user_profiles").select("*").execute()
        profiles = profiles_resp.data or []
        log.info(f"[Scheduler] Found {len(profiles)} profiles to process")

        for profile in profiles:
            try:
                username = profile.get("username")
                if not username:
                    continue

                # Get latest feedback for this user
                feedback_resp = sb.table("performance_feedback") \
                    .select("*").eq("profile_id", profile["id"]) \
                    .order("id", desc=True).limit(1).execute()
                feedback_data = None
                if feedback_resp.data:
                    f = feedback_resp.data[0]
                    feedback_data = {
                        "followers_gained": f.get("followers_gained"),
                        "best_post": f.get("best_post"),
                        "engagement_change": f.get("engagement_change"),
                        "caption_style_used": f.get("caption_style_used", ""),
                        "caption_result": f.get("caption_result", ""),
                    }

                data = {
                    "username": username,
                    "followers": profile.get("followers", 1000),
                    "avg_likes": profile.get("avg_likes", 50),
                    "avg_comments": profile.get("avg_comments", 5),
                    "posting_frequency": str(profile.get("posting_frequency", "3")),
                    "content_type": profile.get("content_type", "Reels"),
                    "brand_tone": profile.get("brand_tone", "Educational"),
                    "goal": profile.get("goal", "Grow Followers"),
                    "target_followers": profile.get("target_followers", profile.get("followers", 1000) + 500),
                    "competitor_username": "",
                }

                log.info(f"[Scheduler] Generating plan for @{username}...")
                result = run_growth_crew(data, feedback_data=feedback_data)

                sb.table("weekly_plans").insert({
                    "profile_id": profile["id"],
                    "engagement_rate": result.get("engagement_rate"),
                    "audit_report": result.get("audit_report"),
                    "strategy_plan": result.get("strategy_plan"),
                    "content_ideas": result.get("content_ideas"),
                    "captions": result.get("captions"),
                    "competitor_analysis": result.get("competitor_analysis", ""),
                    "posting_schedule": result.get("posting_schedule", ""),
                }).execute()

                log.info(f"[Scheduler] ✓ Plan saved for @{username}")

            except Exception as user_err:
                log.error(f"[Scheduler] ✗ Error for @{profile.get('username')}: {user_err}")

    except Exception as e:
        log.error(f"[Scheduler] Fatal error: {e}")


def start_scheduler():
    """Start the APScheduler background job. Called on FastAPI startup."""
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        run_weekly_plans,
        trigger=CronTrigger(day_of_week="mon", hour=9, minute=0),
        id="weekly_growth_plans",
        name="Weekly Growth Plan Generator",
        replace_existing=True,
    )
    scheduler.start()
    log.info("[Scheduler] Started. Next weekly run: every Monday at 9:00 AM")
    return scheduler


# Allow manual trigger for testing
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_weekly_plans()
