export type TelegramUpdate = {
  message?: TelegramMessage
  update_id: number
}

export type TelegramChat = {
  id: number | string
  title?: string
  type: string
  username?: string
}

export type TelegramUser = {
  first_name: string
  id: number
  is_bot: boolean
  last_name?: string
  username?: string
}

export type TelegramForwardOrigin = {
  [key: string]: unknown
  type: string
}

export type TelegramPhotoSize = {
  file_id: string
  file_size?: number
  height: number
  width: number
}

export type TelegramDocument = {
  file_id: string
  file_name?: string
  file_size?: number
  mime_type?: string
}

export type TelegramMessage = {
  caption?: string
  chat: TelegramChat
  date: number
  document?: TelegramDocument
  forward_origin?: TelegramForwardOrigin
  from?: TelegramUser
  is_topic_message?: boolean
  media_group_id?: string
  message_id: number
  message_thread_id?: number
  photo?: TelegramPhotoSize[]
  sender_chat?: TelegramChat
  text?: string
}
