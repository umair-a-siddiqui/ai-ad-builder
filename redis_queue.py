import os
import redis
from rq import Queue

redis_url = os.getenv("REDIS_URL")

if redis_url:
    redis_connection = redis.from_url(
        redis_url,
        decode_responses=False
    )
else:
    redis_connection = redis.Redis(
        host="172.31.203.111",
        port=6379,
        decode_responses=False
    )

video_queue = Queue(
    "video-generation",
    connection=redis_connection
)