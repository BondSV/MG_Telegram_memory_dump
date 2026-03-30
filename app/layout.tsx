import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Telegram Memory Capture",
  description: "Telegram webhook service for Memory Goblin captures.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          background: "#f6f4ef",
          color: "#1f2937",
        }}
      >
        {children}
      </body>
    </html>
  )
}
