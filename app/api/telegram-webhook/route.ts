import { NextRequest, NextResponse } from "next/server"

import { captureThought } from "@/lib/memory-goblin"
import { downloadTelegramFile, sendTelegramReply } from "@/lib/telegram-api"
import { getEnv } from "@/lib/env"
import {
  getFailureReplyText,
  getSuccessReplyText,
  prepareTelegramCapture,
} from "@/lib/telegram-metadata"
import type { TelegramUpdate } from "@/lib/telegram-types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    getEnv()
  } catch (error) {
    console.error("[telegram-webhook] env_validation_failed", {
      error: getErrorMessage(error),
    })
    return NextResponse.json(
      { ok: false, error: "Server configuration is incomplete." },
      { status: 500 },
    )
  }

  let update: TelegramUpdate

  try {
    update = (await request.json()) as TelegramUpdate
  } catch (error) {
    console.error("[telegram-webhook] invalid_json", {
      error: getErrorMessage(error),
    })
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 })
  }

  const prepared = prepareTelegramCapture(update)

  if (prepared.kind === "ignored") {
    console.info("[telegram-webhook] ignored_update", {
      updateId: update.update_id,
      reason: prepared.reason,
    })
    return NextResponse.json({ ok: true, ignored: true })
  }

  if (prepared.kind === "unsupported") {
    console.info("[telegram-webhook] unsupported_message", {
      updateId: update.update_id,
      chatId: prepared.chatId,
      messageId: prepared.replyToMessageId,
      reason: prepared.reason,
    })

    try {
      await sendTelegramReply({
        chatId: prepared.chatId,
        replyToMessageId: prepared.replyToMessageId,
        text: getFailureReplyText(prepared.reason),
      })
    } catch (error) {
      console.error("[telegram-webhook] unsupported_reply_failed", {
        updateId: update.update_id,
        chatId: prepared.chatId,
        messageId: prepared.replyToMessageId,
        error: getErrorMessage(error),
      })
    }

    return NextResponse.json({ ok: true, ignored: true })
  }

  console.info("[telegram-webhook] message_received", {
    updateId: update.update_id,
    chatId: prepared.chatId,
    messageId: prepared.replyToMessageId,
    kind: prepared.kind,
    forwarded: prepared.forwarded,
  })

  try {
    if (prepared.kind === "text") {
      await captureThought({
        content: prepared.content,
        external_id: prepared.externalId,
        metadata: prepared.metadata,
      })
    } else if (prepared.kind === "artifact") {
      const file = await downloadTelegramFile(prepared.fileId)

      await captureThought({
        base64_data: file.bytes.toString("base64"),
        content_type: prepared.contentType,
        external_id: prepared.externalId,
        metadata: {
          ...prepared.metadata,
          telegram_file: {
            downloaded_file_path: file.filePath,
            downloaded_size_bytes: file.bytes.length,
          },
        },
        mime_type: prepared.mimeType,
        original_filename: prepared.originalFilename,
        text: prepared.caption,
      })
    }

    await sendTelegramReply({
      chatId: prepared.chatId,
      replyToMessageId: prepared.replyToMessageId,
      text: getSuccessReplyText(),
    })

    console.info("[telegram-webhook] message_saved", {
      updateId: update.update_id,
      chatId: prepared.chatId,
      messageId: prepared.replyToMessageId,
      kind: prepared.kind,
    })
  } catch (error) {
    const reason = getErrorMessage(error)

    console.error("[telegram-webhook] message_failed", {
      updateId: update.update_id,
      chatId: prepared.chatId,
      messageId: prepared.replyToMessageId,
      kind: prepared.kind,
      error: reason,
    })

    try {
      await sendTelegramReply({
        chatId: prepared.chatId,
        replyToMessageId: prepared.replyToMessageId,
        text: getFailureReplyText(reason),
      })
    } catch (replyError) {
      console.error("[telegram-webhook] failure_reply_failed", {
        updateId: update.update_id,
        chatId: prepared.chatId,
        messageId: prepared.replyToMessageId,
        error: getErrorMessage(replyError),
      })
    }
  }

  return NextResponse.json({ ok: true })
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return "Unknown error"
}
