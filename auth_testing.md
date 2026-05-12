# Auth-Gated App Testing Playbook (OutSide)

## Easy path (recommended for testing): use Dev Seed
POST `/api/auth/dev-seed` with `{"email": "admin@outside.com", "name": "Admin OutSide"}`. This creates / promotes the user to admin and sets a `session_token` cookie. Use this token (also returned in JSON) as `Authorization: Bearer <token>` for backend tests, or just keep the cookie for browser tests.

## Test Backend API
```bash
# Get session_token
TOKEN=$(curl -s -X POST "$API_URL/api/auth/dev-seed" -H "Content-Type: application/json" \
  -d '{"email":"admin@outside.com","name":"Admin"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['session_token'])")

# Verify
curl -X GET "$API_URL/api/auth/me" -H "Authorization: Bearer $TOKEN"

# Admin endpoint
curl -X GET "$API_URL/api/reservas" -H "Authorization: Bearer $TOKEN"
```

## Test User Account (non-admin)
Use a different email (e.g., `user@outside.com`) with dev-seed — but note: dev-seed always sets role=admin. To create a regular user for testing, manually insert one or POST `/api/auth/session` with a real Google session_id (production path).

For tests, just call dev-seed with admin email for admin scope, OR insert a user document directly via mongosh:
```bash
mongosh test_database --eval '
var uid = "user_test_user1";
db.users.insertOne({user_id: uid, email: "user@outside.com", name: "Regular User", role: "user", created_at: new Date().toISOString()});
db.user_sessions.insertOne({user_id: uid, session_token: "user_token_1", expires_at: new Date(Date.now()+7*86400000).toISOString(), created_at: new Date().toISOString()});
print("Token: user_token_1");
'
```

## Browser Testing
Set cookie before navigation:
```python
await page.context.add_cookies([{
    "name": "session_token", "value": TOKEN,
    "domain": "<host>", "path": "/",
    "httpOnly": True, "secure": True, "sameSite": "None"
}])
```

## Cleanup
```bash
mongosh test_database --eval '
db.users.deleteMany({email: /test/});
db.user_sessions.deleteMany({session_token: /test/});
'
```
