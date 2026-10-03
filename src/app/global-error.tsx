"use client";

// Последняя страховка: упал сам каркас приложения (layout). Рисует свой документ без globals.css и без
// переводов, поэтому стили и оба языка заданы прямо здесь. Цвета — как токены в globals.css.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: 24,
          textAlign: "center",
          background: "#fbe3ec",
          color: "#241f1d",
          fontFamily: "Manrope, system-ui, sans-serif",
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Что-то пошло не так</h1>
          <p style={{ fontSize: 14, margin: 0, color: "#6b5c62" }}>Бир нерсе туура эмес болду</p>
        </div>
        <button
          type="button"
          onClick={() => retry()}
          style={{
            height: 48,
            padding: "0 28px",
            border: 0,
            borderRadius: 999,
            background: "#c8135f",
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          Повторить · Кайталоо
        </button>
      </body>
    </html>
  );
}
