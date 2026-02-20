from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from datetime import datetime
import hashlib

app = FastAPI(title="E-Commerce API")

# Data Models
class Product(BaseModel):
    id: int
    name: str
    description: str
    price: float
    image: str
    category: str
    stock: int
    rating: Optional[float] = 0.0
    reviews_count: Optional[int] = 0
    discount: Optional[float] = 0.0

class Review(BaseModel):
    id: Optional[int] = None
    product_id: int
    user_id: int
    user_name: str
    rating: int
    comment: str
    created_at: Optional[str] = None

class Wishlist(BaseModel):
    user_id: int
    product_id: int

class CartItem(BaseModel):
    product_id: int
    quantity: int

class Order(BaseModel):
    id: Optional[int] = None
    user_id: int
    items: List[CartItem]
    total: float
    customer_name: str
    customer_email: str
    shipping_address: str
    payment_method: Optional[str] = "Cash on Delivery"
    status: Optional[str] = "Pending"
    created_at: Optional[str] = None

class User(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

# In-memory storage (in production, use a database)
products_db = [
    {
        "id": 1,
        "name": "Wireless Headphones",
        "description": "High-quality wireless headphones with noise cancellation",
        "price": 99.99,
        "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
        "category": "Electronics",
        "stock": 50,
        "rating": 4.5,
        "reviews_count": 12,
        "discount": 10.0
    },
    {
        "id": 2,
        "name": "Smart Watch",
        "description": "Fitness tracking smartwatch with heart rate monitor",
        "price": 199.99,
        "image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
        "category": "Electronics",
        "stock": 30,
        "rating": 4.8,
        "reviews_count": 25,
        "discount": 15.0
    },
    {
        "id": 3,
        "name": "Running Shoes",
        "description": "Comfortable running shoes with excellent grip",
        "price": 79.99,
        "image": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
        "category": "Sports",
        "stock": 100,
        "rating": 4.3,
        "reviews_count": 8,
        "discount": 0.0
    },
    {
        "id": 4,
        "name": "Coffee Maker",
        "description": "Automatic coffee maker with programmable timer",
        "price": 129.99,
        "image": "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=400",
        "category": "Beverages",
        "stock": 25,
        "rating": 4.6,
        "reviews_count": 15,
        "discount": 20.0
    },
    {
        "id": 5,
        "name": "Backpack",
        "description": "Durable laptop backpack with multiple compartments",
        "price": 49.99,
        "image": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400",
        "category": "Accessories",
        "stock": 75,
        "rating": 4.2,
        "reviews_count": 6,
        "discount": 5.0
    },
    {
        "id": 6,
        "name": "Yoga Mat",
        "description": "Non-slip yoga mat with carrying strap",
        "price": 29.99,
        "image": "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400",
        "category": "Sports",
        "stock": 60,
        "rating": 4.7,
        "reviews_count": 20,
        "discount": 0.0
    }
]

orders_db = []
order_counter = 1

# Users database (in-memory)
users_db = []
user_counter = 1

# Reviews database
reviews_db = []
review_counter = 1

# Wishlist database
wishlist_db = []

# Helper function to hash passwords
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# Helper function to calculate product rating
def calculate_product_rating(product_id: int):
    product_reviews = [r for r in reviews_db if r["product_id"] == product_id]
    if not product_reviews:
        return 0.0, 0
    avg_rating = sum(r["rating"] for r in product_reviews) / len(product_reviews)
    return round(avg_rating, 1), len(product_reviews)

# API Endpoints

@app.get("/")
async def read_root():
    return FileResponse("static/login.html")

@app.get("/shop")
async def shop_page():
    return FileResponse("static/index.html")

# Authentication Endpoints

@app.post("/api/auth/register")
async def register_user(user: User):
    global user_counter
    
    # Check if email already exists
    existing_user = next((u for u in users_db if u["email"] == user.email), None)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash the password
    hashed_password = hash_password(user.password)
    
    # Create new user
    new_user = {
        "id": user_counter,
        "name": user.name,
        "email": user.email,
        "password": hashed_password,
        "created_at": datetime.now().isoformat()
    }
    
    users_db.append(new_user)
    user_counter += 1
    
    return {
        "message": "User registered successfully",
        "user": {
            "id": new_user["id"],
            "name": new_user["name"],
            "email": new_user["email"]
        }
    }

@app.post("/api/auth/login")
async def login_user(credentials: UserLogin):
    # Find user by email
    user = next((u for u in users_db if u["email"] == credentials.email), None)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check password
    hashed_password = hash_password(credentials.password)
    if user["password"] != hashed_password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Return user data (excluding password)
    return {
        "message": "Login successful",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"]
        }
    }

@app.get("/api/auth/users")
async def get_all_users():
    # Return all users without passwords (for testing/admin purposes)
    return [{
        "id": u["id"],
        "name": u["name"],
        "email": u["email"],
        "created_at": u["created_at"]
    } for u in users_db]

@app.get("/api/products", response_model=List[Product])
async def get_products(category: Optional[str] = None):
    if category:
        return [p for p in products_db if p["category"] == category]
    return products_db

@app.get("/api/products/{product_id}", response_model=Product)
async def get_product(product_id: int):
    product = next((p for p in products_db if p["id"] == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.get("/api/categories")
async def get_categories():
    categories = list(set(p["category"] for p in products_db))
    return {"categories": categories}

@app.post("/api/orders")
async def create_order(order: Order):
    global order_counter
    
    # Validate products and calculate total
    total = 0
    for item in order.items:
        product = next((p for p in products_db if p["id"] == item.product_id), None)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if product["stock"] < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product['name']}")
        total += product["price"] * item.quantity
    
    # Create order
    new_order = {
        "id": order_counter,
        "user_id": order.user_id,
        "items": [item.dict() for item in order.items],
        "total": round(total, 2),
        "customer_name": order.customer_name,
        "customer_email": order.customer_email,
        "shipping_address": order.shipping_address,
        "payment_method": order.payment_method,
        "status": order.status,
        "created_at": datetime.now().isoformat()
    }
    
    # Update stock
    for item in order.items:
        product = next(p for p in products_db if p["id"] == item.product_id)
        product["stock"] -= item.quantity
    
    orders_db.append(new_order)
    order_counter += 1
    
    return new_order

@app.get("/api/orders/{order_id}")
async def get_order(order_id: int):
    order = next((o for o in orders_db if o["id"] == order_id), None)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

# Order History
@app.get("/api/orders/user/{user_id}")
async def get_user_orders(user_id: int):
    user_orders = [o for o in orders_db if o["user_id"] == user_id]
    return sorted(user_orders, key=lambda x: x["created_at"], reverse=True)

# Product Search
@app.get("/api/products/search/{query}")
async def search_products(query: str):
    query_lower = query.lower()
    results = [
        p for p in products_db 
        if query_lower in p["name"].lower() or query_lower in p["description"].lower()
    ]
    return results

# Reviews Endpoints
@app.post("/api/reviews")
async def create_review(review: Review):
    global review_counter
    
    # Check if product exists
    product = next((p for p in products_db if p["id"] == review.product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if user already reviewed this product
    existing_review = next(
        (r for r in reviews_db if r["product_id"] == review.product_id and r["user_id"] == review.user_id), 
        None
    )
    if existing_review:
        raise HTTPException(status_code=400, detail="You have already reviewed this product")
    
    # Create review
    new_review = {
        "id": review_counter,
        "product_id": review.product_id,
        "user_id": review.user_id,
        "user_name": review.user_name,
        "rating": review.rating,
        "comment": review.comment,
        "created_at": datetime.now().isoformat()
    }
    
    reviews_db.append(new_review)
    review_counter += 1
    
    # Update product rating
    avg_rating, review_count = calculate_product_rating(review.product_id)
    product["rating"] = avg_rating
    product["reviews_count"] = review_count
    
    return new_review

@app.get("/api/reviews/product/{product_id}")
async def get_product_reviews(product_id: int):
    product_reviews = [r for r in reviews_db if r["product_id"] == product_id]
    return sorted(product_reviews, key=lambda x: x["created_at"], reverse=True)

# Wishlist Endpoints
@app.post("/api/wishlist")
async def add_to_wishlist(wishlist_item: Wishlist):
    # Check if product exists
    product = next((p for p in products_db if p["id"] == wishlist_item.product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if already in wishlist
    existing = next(
        (w for w in wishlist_db if w["user_id"] == wishlist_item.user_id and w["product_id"] == wishlist_item.product_id),
        None
    )
    if existing:
        raise HTTPException(status_code=400, detail="Product already in wishlist")
    
    new_wishlist_item = {
        "user_id": wishlist_item.user_id,
        "product_id": wishlist_item.product_id,
        "added_at": datetime.now().isoformat()
    }
    
    wishlist_db.append(new_wishlist_item)
    return {"message": "Added to wishlist", "item": new_wishlist_item}

@app.get("/api/wishlist/{user_id}")
async def get_user_wishlist(user_id: int):
    user_wishlist = [w for w in wishlist_db if w["user_id"] == user_id]
    # Get full product details for wishlist items
    wishlist_products = []
    for item in user_wishlist:
        product = next((p for p in products_db if p["id"] == item["product_id"]), None)
        if product:
            wishlist_products.append({
                **product,
                "added_at": item["added_at"]
            })
    return wishlist_products

@app.delete("/api/wishlist/{user_id}/{product_id}")
async def remove_from_wishlist(user_id: int, product_id: int):
    global wishlist_db
    original_length = len(wishlist_db)
    wishlist_db = [
        w for w in wishlist_db 
        if not (w["user_id"] == user_id and w["product_id"] == product_id)
    ]
    
    if len(wishlist_db) == original_length:
        raise HTTPException(status_code=404, detail="Item not found in wishlist")
    
    return {"message": "Removed from wishlist"}

# Admin Endpoints
@app.get("/api/admin/all-orders")
async def get_all_orders():
    return sorted(orders_db, key=lambda x: x["created_at"], reverse=True)

@app.get("/api/admin/stats")
async def get_admin_stats():
    total_users = len(users_db)
    total_orders = len(orders_db)
    total_revenue = sum(o["total"] for o in orders_db)
    total_products = len(products_db)
    
    return {
        "total_users": total_users,
        "total_orders": total_orders,
        "total_revenue": round(total_revenue, 2),
        "total_products": total_products
    }

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)