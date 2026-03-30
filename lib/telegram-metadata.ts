import type {
  TelegramDocument,
  TelegramMessage,
  TelegramPhotoSize,
  TelegramUpdate,
} from "@/lib/telegram-types"

type SupportedContentType = "image" | "markdown" | "pdf" | "text_file"

type IgnoredCapture = {
  kind: "ignored"
  reason: string
}

type UnsupportedCapture = {
  chatId: number | string
  kind: "unsupported"
  reason: string
  replyToMessageId: number
}

type TextCapture = {
  chatId: number | string
  content: string
  externalId: string
  forwarded: boolean
  kind: "text"
  metadata: Record<string, unknown>
  replyToMessageId: number
}

type ArtifactCapture = {
  caption?: string
  chatId: number | string
  contentType: SupportedContentType
  externalId: string
  fileId: string
  forwarded: boolean
  kind: "artifact"
  metadata: Record<string, unknown>
  mimeType: string
  originalFilename?: string
  replyToMessageId: number
}

export type PreparedTelegramCapture = ArtifactCapture | IgnoredCapture | TextCapture | UnsupportedCapture

const DOCUMENT_BY_MIME: Record<string, { contentType: SupportedContentType; mimeType: string }> = {
  "application/pdf": { contentType: "pdf", mimeType: "application/pdf" },
  "image/heic": { contentType: "image", mimeType: "image/heic" },
  "image/heif": { contentType: "image", mimeType: "image/heif" },
  "image/jpeg": { contentType: "image", mimeType: "image/jpeg" },
  "image/png": { contentType: "image", mimeType: "image/png" },
  "text/markdown": { contentType: "markdown", mimeType: "text/markdown" },
  "text/plain": { contentType: "text_file", mimeType: "text/plain" },
  "text/x-markdown": { contentType: "markdown", mimeType: "text/x-markdown" },
}

const DOCUMENT_BY_EXTENSION: Record<string, { contentType: SupportedContentType; mimeType: string }> = {
  heic: { contentType: "image", mimeType: "image/heic" },
  heif: { contentType: "image", mimeType: "image/heif" },
  jpeg: { contentType: "image", mimeType: "image/jpeg" },
  jpg: { contentType: "image", mimeType: "image/jpeg" },
  markdown: { contentType: "markdown", mimeType: "text/markdown" },
  md: { contentType: "markdown", mimeType: "text/markdown" },
  pdf: { contentType: "pdf", mimeType: "application/pdf" },
  png: { contentType: "image", mimeType: "image/png" },
  txt: { contentType: "text_file", mimeType: "text/plain" },
}

export function prepareTelegramCapture(update: TelegramUpdate): PreparedTelegramCapture {
  const message = update.message

  if (!message) {
    return {
      kind: "ignored",
      reason: "No message payload on update.",
    }
  }

  const base = {
    chatId: message.chat.id,
    externalId: buildExternalId(message),
    forwarded: Boolean(message.forward_origin),
    metadata: buildMessageMetadata(update, message),
    replyToMessageId: message.message_id,
  }

  if (typeof message.text === "string" && message.text.length > 0) {
    return {
      ...base,
      content: message.text,
      kind: "text",
    }
  }

  if (message.photo?.length) {
    const photo = pickLargestPhoto(message.photo)

    return {
      ...base,
      caption: message.caption,
      contentType: "image",
      fileId: photo.file_id,
      kind: "artifact",
      metadata: {
        ...base.metadata,
        telegram_media: {
          photo_count: message.photo.length,
          selected_file_id: photo.file_id,
          selected_file_size: photo.file_size ?? null,
          selected_height: photo.height,
          selected_width: photo.width,
        },
      },
      mimeType: "image/jpeg",
    }
  }

  if (message.document) {
    const classification = classifyDocument(message.document)

    if (!classification) {
      return {
        chatId: base.chatId,
        kind: "unsupported",
        reason: "Unsupported document type.",
        replyToMessageId: base.replyToMessageId,
      }
    }

    return {
      ...base,
      caption: message.caption,
      contentType: classification.contentType,
      fileId: message.document.file_id,
      kind: "artifact",
      metadata: {
        ...base.metadata,
        telegram_media: {
          document_file_id: message.document.file_id,
          document_file_name: message.document.file_name ?? null,
          document_file_size: message.document.file_size ?? null,
          document_mime_type: message.document.mime_type ?? null,
        },
      },
      mimeType: classification.mimeType,
      originalFilename: message.document.file_name,
    }
  }

  return {
    chatId: base.chatId,
    kind: "unsupported",
    reason: "Unsupported message type.",
    replyToMessageId: base.replyToMessageId,
  }
}

export function getSuccessReplyText(): string {
  return "Saved"
}

export function getFailureReplyText(reason: string): string {
  const normalizedReason = reason
    .replace(/^failed to save:?\s*/i, "")
    .replace(/\.$/, "")
    .replace(/\s+/g, " ")
    .trim()

  if (!normalizedReason) {
    return "Failed to save"
  }

  const shortReason = normalizedReason.length > 72
    ? `${normalizedReason.slice(0, 69).trimEnd()}...`
    : normalizedReason

  return `Failed to save: ${shortReason}`
}

function buildMessageMetadata(update: TelegramUpdate, message: TelegramMessage): Record<string, unknown> {
  return {
    source: "telegram",
    telegram: {
      chat: {
        id: message.chat.id,
        title: message.chat.title ?? null,
        type: message.chat.type,
        username: message.chat.username ?? null,
      },
      date_iso: new Date(message.date * 1000).toISOString(),
      date_unix: message.date,
      forward_origin: message.forward_origin ?? null,
      from: message.from ? serializeActor(message.from) : null,
      has_caption: Boolean(message.caption),
      is_topic_message: message.is_topic_message ?? false,
      media_group_id: message.media_group_id ?? null,
      message_id: message.message_id,
      message_thread_id: message.message_thread_id ?? null,
      sender_chat: message.sender_chat ? serializeActor(message.sender_chat) : null,
      update_id: update.update_id,
    },
  }
}

function buildExternalId(message: TelegramMessage): string {
  return `telegram:${message.chat.id}:${message.message_id}`
}

function classifyDocument(document: TelegramDocument): { contentType: SupportedContentType; mimeType: string } | null {
  const mimeType = document.mime_type?.toLowerCase()

  if (mimeType && DOCUMENT_BY_MIME[mimeType]) {
    return DOCUMENT_BY_MIME[mimeType]
  }

  const extension = document.file_name?.split(".").pop()?.toLowerCase()

  if (extension && DOCUMENT_BY_EXTENSION[extension]) {
    return DOCUMENT_BY_EXTENSION[extension]
  }

  return null
}

function pickLargestPhoto(photos: TelegramPhotoSize[]): TelegramPhotoSize {
  return [...photos].sort((left, right) => {
    const leftSize = left.file_size ?? 0
    const rightSize = right.file_size ?? 0

    if (leftSize !== rightSize) {
      return rightSize - leftSize
    }

    return (right.width * right.height) - (left.width * left.height)
  })[0]
}

function serializeActor(actor: {
  first_name?: string
  id: number | string
  is_bot?: boolean
  last_name?: string
  title?: string
  type?: string
  username?: string
}): Record<string, unknown> {
  return {
    first_name: actor.first_name ?? null,
    id: actor.id,
    is_bot: actor.is_bot ?? null,
    last_name: actor.last_name ?? null,
    title: actor.title ?? null,
    type: actor.type ?? null,
    username: actor.username ?? null,
  }
}
