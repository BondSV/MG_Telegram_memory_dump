import { getEnv } from "@/lib/env"

type ContentType = "image" | "markdown" | "pdf" | "text" | "text_file"

export type CaptureThoughtInput = {
  base64_data?: string
  content?: string
  content_type?: ContentType
  external_id?: string
  extracted_text?: string
  metadata?: Record<string, unknown>
  mime_type?: string
  original_filename?: string
  source_uri?: string
  text?: string
  title?: string
}

type JsonRpcSuccess = {
  id: string
  jsonrpc: "2.0"
  result: {
    content?: Array<{ text?: string; type?: string }>
    [key: string]: unknown
  }
}

type JsonRpcFailure = {
  error: {
    code?: number
    data?: unknown
    message?: string
  }
  id: string | null
  jsonrpc: "2.0"
}

export async function captureThought(input: CaptureThoughtInput): Promise<void> {
  const env = getEnv()
  const requestId = input.external_id ?? crypto.randomUUID()

  const response = await fetch(env.memoryGoblinUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-brain-key": env.memoryGoblinAccessKey,
    },
    body: JSON.stringify({
      id: requestId,
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        arguments: input,
        name: "capture_thought",
      },
    }),
  })

  const rawBody = await response.text()

  if (!response.ok) {
    throw new Error(`Memory Goblin HTTP ${response.status}: ${truncate(rawBody)}`)
  }

  let payload: JsonRpcFailure | JsonRpcSuccess

  try {
    payload = JSON.parse(rawBody) as JsonRpcFailure | JsonRpcSuccess
  } catch {
    throw new Error(`Memory Goblin returned invalid JSON: ${truncate(rawBody)}`)
  }

  if ("error" in payload) {
    throw new Error(payload.error.message ?? "Memory Goblin returned an unknown error.")
  }
}

function truncate(value: string, limit = 180): string {
  const singleLine = value.replace(/\s+/g, " ").trim()

  if (singleLine.length <= limit) {
    return singleLine
  }

  return `${singleLine.slice(0, limit - 3)}...`
}
