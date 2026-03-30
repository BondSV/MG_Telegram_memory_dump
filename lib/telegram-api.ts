import { getEnv } from "@/lib/env"

type TelegramApiSuccess<T> = {
  ok: true
  result: T
}

type TelegramApiFailure = {
  description?: string
  error_code?: number
  ok: false
}

type TelegramFileResult = {
  file_path: string
  file_size?: number
}

export async function downloadTelegramFile(fileId: string): Promise<{
  bytes: Buffer
  filePath: string
}> {
  const fileInfo = await callTelegramApi<TelegramFileResult>("getFile", {
    file_id: fileId,
  })

  const env = getEnv()
  const response = await fetch(`https://api.telegram.org/file/bot${env.telegramBotToken}/${fileInfo.file_path}`)

  if (!response.ok) {
    throw new Error(`Telegram file download failed with HTTP ${response.status}.`)
  }

  const arrayBuffer = await response.arrayBuffer()

  return {
    bytes: Buffer.from(arrayBuffer),
    filePath: fileInfo.file_path,
  }
}

export async function sendTelegramReply(input: {
  chatId: number | string
  replyToMessageId: number
  text: string
}): Promise<void> {
  await callTelegramApi("sendMessage", {
    allow_sending_without_reply: true,
    chat_id: input.chatId,
    reply_to_message_id: input.replyToMessageId,
    text: input.text,
  })
}

async function callTelegramApi<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const env = getEnv()
  const response = await fetch(`https://api.telegram.org/bot${env.telegramBotToken}/${method}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })

  const rawBody = await response.text()

  if (!response.ok) {
    throw new Error(`Telegram ${method} HTTP ${response.status}: ${truncate(rawBody)}`)
  }

  let payload: TelegramApiFailure | TelegramApiSuccess<T>

  try {
    payload = JSON.parse(rawBody) as TelegramApiFailure | TelegramApiSuccess<T>
  } catch {
    throw new Error(`Telegram ${method} returned invalid JSON.`)
  }

  if (!payload.ok) {
    throw new Error(payload.description ?? `Telegram ${method} failed.`)
  }

  return payload.result
}

function truncate(value: string, limit = 180): string {
  const singleLine = value.replace(/\s+/g, " ").trim()

  if (singleLine.length <= limit) {
    return singleLine
  }

  return `${singleLine.slice(0, limit - 3)}...`
}
