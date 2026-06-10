import asyncio
import json
import urllib.request
try:
    import websockets
except ImportError:
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "websockets"])
    import websockets

async def test_echo():
    uri = "ws://localhost:8000/ws/chat/test1234/"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected!")
            
            # Send message
            message_data = {
                "type": "message",
                "message": "Hello from Python test script!"
            }
            await websocket.send(json.dumps(message_data))
            print(f"> Sent: {message_data}")
            
            # Receive response
            response = await websocket.recv()
            print(f"< Received: {response}")
            
            response_json = json.loads(response)
            if response_json.get("message") == "Hello from Python test script!":
                print("SUCCESS: Echo test passed!")
            else:
                print("FAILURE: Did not receive expected echo message.")
                
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    # Ensure django server is accessible before running
    try:
        urllib.request.urlopen("http://localhost:8000/api/accounts/health/")
    except Exception:
        print("Waiting for Django server to be up...")
    asyncio.run(test_echo())
