from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import openai
import os
from dotenv import load_dotenv
from pymongo import MongoClient

# Load environment variables
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")
mongo_uri = os.getenv("MONGODB_URI")
mongo_db = os.getenv("MONGODB_DB")

# MongoDB connection
client = MongoClient(mongo_uri)
db = client[mongo_db]
products_collection = db["products"]

# FastAPI setup
app = FastAPI()
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limit handler
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429, content={"reply": "You're sending messages too fast. Please wait."}
    )

# Chat endpoint
@limiter.limit("5/minute")
@app.post("/chat")
async def chat(request: Request):
    data = await request.json()
    messages = data.get("messages")

    # Enforce input limit
    user_input = next((msg["content"] for msg in reversed(messages) if msg["role"] == "user"), "")
    if len(user_input) > 300:
        return {"reply": "Your message is too long. Limit it to 300 characters."}

    try:
        # Fetch product names from MongoDB
        products = products_collection.find({}, {"name": 1, "_id": 0})
        product_list = ", ".join(p["name"] for p in products)

        system_prompt = (
            "You're a helpful skincare chatbot for an e-commerce website. "
            "You answer questions about products, recommend items based on skin types, "
            "explain how to use them, and help with order and shipping questions. "
            f"The products available are: {product_list}."
        )

        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "system", "content": system_prompt}, *messages],
        )

        return {"reply": response.choices[0].message.content}

    except Exception as e:
        return {"reply": "Something went wrong while processing your request."}