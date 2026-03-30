type Env = {
  memoryGoblinAccessKey: string
  memoryGoblinUrl: string
  telegramBotToken: string
}

let cachedEnv: Env | null = null

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv
  }

  cachedEnv = {
    memoryGoblinAccessKey: readRequiredEnv("MEMORY_GOBLIN_ACCESS_KEY"),
    memoryGoblinUrl: readRequiredEnv("MEMORY_GOBLIN_URL"),
    telegramBotToken: readRequiredEnv("TELEGRAM_BOT_TOKEN"),
  }

  return cachedEnv
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}
