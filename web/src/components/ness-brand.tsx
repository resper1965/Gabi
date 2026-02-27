"use client"

/**
 * ness. brand mark — Montserrat Medium 500
 * Text: white (dark bg) or black (light bg)
 * Dot: #00ade8
 */
export function NessBrand({
  size = "text-sm",
  variant = "light",
  className = "",
}: {
  size?: string
  variant?: "light" | "dark"
  className?: string
}) {
  const textColor = variant === "light" ? "#ffffff" : "#0a0a0a"
  return (
    <span
      className={`${size} ${className}`}
      style={{
        fontFamily: "Montserrat, sans-serif",
        fontWeight: 500,
        color: textColor,
        letterSpacing: "-0.01em",
        textTransform: "lowercase" as const,
      }}
    >
      ness<span style={{ color: "#00ade8" }}>.</span>
    </span>
  )
}
