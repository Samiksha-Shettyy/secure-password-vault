| Check | Before | After | Result |
|---|---|---|---|
| Header x-content-type-options | PASS | PASS |  |
| Header x-frame-options | PASS | PASS |  |
| Header content-security-policy | PASS | PASS |  |
| Header referrer-policy | PASS | PASS |  |
| Header x-powered-by hidden | PASS | PASS |  |
| CORS rejects unknown origin | PASS | PASS |  |
| CORS allows the frontend | PASS | PASS |  |
| Vault blocked without login | PASS | PASS |  |
| No stack trace in error responses | FAIL | PASS | FIXED |
| Large body rejected (2 MB) | PASS | PASS |  |
| Cookie HttpOnly | PASS | PASS |  |
| Cookie SameSite=Strict | PASS | PASS |  |
| Cookie Secure | INFO | INFO |  |
| Account lockout after 5 failures | PASS | PASS |  |
| Rate limit on /register (40 requests) | FAIL | PASS | FIXED |
| Rate limit on /login | PASS | PASS |  |
