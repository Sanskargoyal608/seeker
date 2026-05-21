# Seeker WebSocket API Documentation

## Connection Details

The Seeker WebSocket API allows real-time bidirection communication between clients and the server using Django Channels.

**Base URL**: `ws://<domain>/ws/`
**Development URL**: `ws://localhost:8000/ws/`

## 1. Chat Connection

Connects a user to a specific chat room (session). 

**Endpoint**: `/ws/chat/<session_id>/`

### Example
`ws://localhost:8000/ws/chat/session_123/`

### Message Format

The WebSocket connection uses JSON for message formatting.

#### Sending a Message
To send a message, send a JSON object with `type: "message"` and the message content:

```json
{
  "type": "message",
  "message": "Hello, how are you?"
}
```

#### Receiving a Message
When a message is received in the room, the server broadcasts it to all connected clients in the format:

```json
{
  "type": "chat.message",
  "message": "Hello, how are you?",
  "sender": "Other"
}
```

(Note: `sender` will be updated to reflect the actual user sending the message in future iterations. For Sprint 1, it defaults to "Other").

## Testing

For testing, use the provided Postman collection `Seeker Phase 2 - WebSocket Echo.json` or `wscat`:

```bash
wscat -c ws://localhost:8000/ws/chat/test/
> {"type": "message", "message": "Test Message"}
< {"type": "chat.message", "message": "Test Message", "sender": "Other"}
```
