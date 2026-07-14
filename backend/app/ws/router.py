import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.auth.dependencies import get_current_user_ws
from app.ws.manager import manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    room: str = Query("global"),
):
    user = await get_current_user_ws(token)
    if not user:
        await websocket.close(code=4001)
        return

    user_id = str(user.id)
    await manager.connect(websocket, room=room, user_id=user_id)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, room=room, user_id=user_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, room=room, user_id=user_id)
