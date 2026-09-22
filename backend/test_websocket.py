import asyncio
from backend.app.websocket.manager import ws_manager

class MockWebSocket:
    def __init__(self, client_id):
        self.client_id = client_id
        self.received = []

    async def accept(self):
        pass

    async def send_text(self, data):
        self.received.append(data)

async def test_websocket_manager():
    client1 = MockWebSocket("c1")
    client2 = MockWebSocket("c2")

    trip_id = "trp_demo_1"

    await ws_manager.connect(trip_id, client1, user_id="usr_1")
    await ws_manager.connect(trip_id, client2, user_id="usr_2")

    assert len(ws_manager.active_connections[trip_id]) == 2
    assert "usr_1" in ws_manager.trip_presence[trip_id]
    assert "usr_2" in ws_manager.trip_presence[trip_id]

    # Test broadcast
    await ws_manager.broadcast(trip_id, {"type": "test_event", "data": "hello trip"})

    assert len(client1.received) >= 1
    assert len(client2.received) >= 1
    assert "hello trip" in client1.received[-1]
    assert "hello trip" in client2.received[-1]

    # Test disconnect
    await ws_manager.disconnect(trip_id, client1, user_id="usr_1")
    assert len(ws_manager.active_connections[trip_id]) == 1
    assert "usr_1" not in ws_manager.trip_presence[trip_id]

    print("WebSocket Manager verification test PASSED!")

if __name__ == "__main__":
    asyncio.run(test_websocket_manager())
