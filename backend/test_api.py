import asyncio
import os
from main import generate_growth_plan, ProfileInput

import socket

original_getaddrinfo = socket.getaddrinfo

def patched_getaddrinfo(*args, **kwargs):
    if args[0] == 'ojsgvbczmfiuuekkkzha.supabase.co':
        return original_getaddrinfo('104.18.38.10', *args[1:], **kwargs)
    return original_getaddrinfo(*args, **kwargs)

socket.getaddrinfo = patched_getaddrinfo

def test():
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
    try:
        profile = ProfileInput(**data)
        res = asyncio.run(generate_growth_plan(profile))
        print("SUCCESS:", res)
    except Exception as e:
        import traceback
        with open("traceback.txt", "w") as f:
            f.write("EXCEPTION RAISED: " + str(type(e)) + "\n")
            f.write("EXCEPTION STR: " + str(e) + "\n")
            traceback.print_exc(file=f)
        print("Error written to traceback.txt")

if __name__ == "__main__":
    test()
