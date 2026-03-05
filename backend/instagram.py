import instaloader
import statistics

def fetch_public_profile(username: str) -> dict | None:
    """
    Fetches public Instagram profile stats using instaloader.
    Returns dict with followers, avg_likes, avg_comments or None on failure.
    """
    try:
        L = instaloader.Instaloader(
            download_pictures=False,
            download_videos=False,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=False,
            quiet=True,
        )
        
        profile = instaloader.Profile.from_username(L.context, username)
        
        # Skip private profiles
        if profile.is_private:
            return {"error": "private"}
        
        followers = profile.followers
        
        # Sample the last 12 posts for engagement averages
        likes_list = []
        comments_list = []
        count = 0
        for post in profile.get_posts():
            if count >= 12:
                break
            likes_list.append(post.likes)
            comments_list.append(post.comments)
            count += 1
        
        avg_likes = int(statistics.mean(likes_list)) if likes_list else 0
        avg_comments = int(statistics.mean(comments_list)) if comments_list else 0
        
        return {
            "username": profile.username,
            "followers": followers,
            "avg_likes": avg_likes,
            "avg_comments": avg_comments,
            "bio": profile.biography[:120] if profile.biography else "",
            "posts_count": profile.mediacount,
        }
    except instaloader.exceptions.ProfileNotExistsException:
        return {"error": "not_found"}
    except Exception as e:
        return {"error": str(e)}
