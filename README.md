# Telegram Memory Capture

Telegram webhook service that stores each inbound Telegram message as a separate Memory Goblin capture.

It is intentionally thin:

- no agent layer
- no polling
- no slash commands
- no batching
- no summarisation

Supported inputs:

- text messages
- forwarded text messages
- photo messages
- supported document uploads: PDF, Markdown, plain text, and supported image files sent as documents

Captions on photos and documents are passed through as extra context in the same Memory Goblin capture. Forward metadata, including Telegram `forward_origin`, is preserved in metadata when present.

## Required environment variables

- `TELEGRAM_BOT_TOKEN`
- `MEMORY_GOBLIN_URL`
- `MEMORY_GOBLIN_ACCESS_KEY`

`MEMORY_GOBLIN_URL` should point at the deployed Memory Goblin MCP HTTP endpoint that accepts `x-brain-key` and `tools/call` requests.

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local env file:

   ```bash
   cp .env.example .env.local
   ```

3. Fill in the required environment variables.

4. Start the app:

   ```bash
   npm run dev
   ```

5. Expose your local server to Telegram with a tunnel if needed, then set the Telegram webhook to:

   ```text
   https://YOUR-PUBLIC-URL/api/telegram-webhook
   ```

## Deploying to Vercel Hobby

1. Create a new Vercel project from this repository.
2. Add the three required environment variables in the Vercel project settings.
3. Deploy the project.
4. After the first deployment, copy the production URL.
5. Set the Telegram webhook to the deployed endpoint.

## Set the Telegram webhook manually

Replace the placeholders and run:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://<YOUR-DEPLOYMENT-URL>/api/telegram-webhook"}'
```

You can verify the webhook with:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

## Project structure

```text
app/
  api/telegram-webhook/route.ts
  layout.tsx
  page.tsx
lib/
  env.ts
  memory-goblin.ts
  telegram-api.ts
  telegram-metadata.ts
  telegram-types.ts
```

## Runtime behavior

- Telegram sends updates to `/api/telegram-webhook`
- The handler classifies the message and extracts minimal Telegram metadata
- Text is sent directly to Memory Goblin
- Supported files are downloaded from Telegram, base64 encoded, and forwarded to Memory Goblin with metadata and optional caption context
- Telegram receives a short confirmation reply:
  - success: `Saved`
  - failure: `Failed to save` with a short readable suffix when useful
