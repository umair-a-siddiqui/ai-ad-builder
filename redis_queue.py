import redis
from rq import Queue

redis_connection = redis.Redis(
    host="172.31.203.111",
    port=6379,
    decode_responses=False
)

video_queue = Queue(
    "video-generation",
    connection=redis_connection
)