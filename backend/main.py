from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio
import random
from typing import Dict, List

app = FastAPI(title="AutoTrader Backend")

# TEMP: Open CORS (tighten later)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active WebSocket connections
active_connections: List[WebSocket] = []

# Mock price data for demo
price_data = {
    "BTCUSD": 43250.0,
    "ETHUSD": 2650.0,
    "AAPL": 185.0,
    "SPY": 475.0,
    "QQQ": 385.0,
    "GC": 2050.0,
    "ES": 4750.0,
    "EURUSD": 1.0850,
}

@app.get("/")
def root():
    return {"message": "AutoTrader Backend API", "status": "running"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/health")
def api_health():
    return {"status": "ok"}

# Price endpoints for polling fallback
@app.get("/prices/{symbol}")
def get_price(symbol: str):
    symbol_upper = symbol.upper()
    base_price = price_data.get(symbol_upper, 100.0)
    # Add some random variation
    variation = random.uniform(-0.02, 0.02)
    current_price = base_price * (1 + variation)
    
    return {
        "symbol": symbol_upper,
        "price": round(current_price, 2),
        "timestamp": asyncio.get_event_loop().time()
    }

@app.get("/api/prices/{symbol}")
def get_api_price(symbol: str):
    return get_price(symbol)

# WebSocket endpoints
async def broadcast_message(message: dict):
    """Broadcast message to all connected clients"""
    if active_connections:
        disconnected = []
        for connection in active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except:
                disconnected.append(connection)
        
        # Remove disconnected clients
        for conn in disconnected:
            if conn in active_connections:
                active_connections.remove(conn)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        while True:
            try:
                # Wait for message with timeout
                message = await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
                
                try:
                    data = json.loads(message)
                except json.JSONDecodeError:
                    data = {"raw": message}
                
                # Handle ping/pong
                if (isinstance(data, dict) and data.get("type") == "ping") or message == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                elif isinstance(data, dict) and data.get("action") == "subscribe":
                    # Handle subscription
                    await websocket.send_text(json.dumps({
                        "type": "subscribed",
                        "channel": data.get("channel"),
                        "symbol": data.get("symbol")
                    }))
                else:
                    # Echo back with acknowledgment
                    await websocket.send_text(json.dumps({"type": "ack", "received": data}))
                    
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                await websocket.send_text(json.dumps({"type": "ping"}))
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)

@app.websocket("/api/ws")
async def api_websocket_endpoint(websocket: WebSocket):
    await websocket_endpoint(websocket)

# Background task to simulate price updates
async def price_updater():
    """Background task to send price updates to connected clients"""
    while True:
        if active_connections:
            # Update a random symbol
            symbol = random.choice(list(price_data.keys()))
            base_price = price_data[symbol]
            variation = random.uniform(-0.01, 0.01)
            new_price = base_price * (1 + variation)
            price_data[symbol] = new_price
            
            # Broadcast price update
            await broadcast_message({
                "type": "price",
                "symbol": symbol,
                "price": round(new_price, 2),
                "timestamp": asyncio.get_event_loop().time()
            })
        
        await asyncio.sleep(2)  # Update every 2 seconds

# Start background task
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(price_updater())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)