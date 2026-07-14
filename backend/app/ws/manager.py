import json
import logging
from typing import Any, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, Set[WebSocket]] = {}
        self.user_connections: dict[str, Set[WebSocket]] = {}

    async def connect(
        self, websocket: WebSocket, room: str = "global", user_id: str | None = None
    ):
        await websocket.accept()
        if room not in self.active_connections:
            self.active_connections[room] = set()
        self.active_connections[room].add(websocket)
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = set()
            self.user_connections[user_id].add(websocket)
        logger.info(f"WebSocket connected to room '{room}' (user={user_id})")

    def disconnect(
        self, websocket: WebSocket, room: str = "global", user_id: str | None = None
    ):
        if room in self.active_connections:
            self.active_connections[room].discard(websocket)
        if user_id and user_id in self.user_connections:
            self.user_connections[user_id].discard(websocket)
        logger.info(f"WebSocket disconnected from room '{room}'")

    async def broadcast_to_room(self, room: str, message: dict[str, Any]):
        if room not in self.active_connections:
            return
        dead: list[WebSocket] = []
        for connection in self.active_connections[room]:
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for conn in dead:
            self.active_connections[room].discard(conn)

    async def broadcast_to_user(self, user_id: str, message: dict[str, Any]):
        if user_id not in self.user_connections:
            return
        dead: list[WebSocket] = []
        for connection in self.user_connections[user_id]:
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for conn in dead:
            self.user_connections[user_id].discard(conn)

    async def broadcast(self, message: dict[str, Any]):
        for room in list(self.active_connections.keys()):
            await self.broadcast_to_room(room, message)


manager = ConnectionManager()
