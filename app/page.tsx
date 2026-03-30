export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
      }}
    >
      <div
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "1rem",
          padding: "1.25rem 1.5rem",
          background: "#ffffff",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
        }}
      >
        Service is running.
      </div>
    </main>
  )
}
