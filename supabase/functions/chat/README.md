# Chat Edge Function

Minimal ClearStack backend path:

1. Frontend sends `{ message, history, setup }` to this function.
2. This function calls Vertex AI.
3. This function returns `{ "reply": "..." }`.

Required Supabase secrets:

```txt
VERTEX_PROJECT_ID=
VERTEX_LOCATION=global
VERTEX_MODEL=
GOOGLE_SERVICE_ACCOUNT_JSON=
```

Deploy:

```sh
supabase functions deploy chat
```

Current deployed URL:

```txt
https://ceixekzyacenqitfzvcw.supabase.co/functions/v1/chat
```

Simple verification after deploy:

```sh
curl -X POST "https://ceixekzyacenqitfzvcw.supabase.co/functions/v1/chat" \
  -H "Authorization: Bearer USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"What files should I create first?\",\"history\":[],\"setup\":{\"stage\":\"MVP Development\",\"projectTypes\":[\"Web app\"]}}"
```

Expected result:

```json
{ "reply": "..." }
```

A request without `Authorization` should return `401 Missing authorization header`.
