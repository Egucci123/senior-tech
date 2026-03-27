import React from "react";
import ReactMarkdown from "react-markdown";
import { Wrench } from "lucide-react";

export default function ChatBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div className="msg-enter" style={{
      display: "flex", gap: 10,
      justifyContent: isUser ? "flex-end" : "flex-start",
    }}>

      {/* Senior Tech hexagon avatar */}
      {!isUser && (
        <div className="hexagon" style={{
          flexShrink: 0, width: 32, height: 32,
          background: "var(--blue)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginTop: 2,
        }}>
          <Wrench size={15} color="#0f0f0f" strokeWidth={2.5} />
        </div>
      )}

      {/* Bubble */}
      <div style={{ maxWidth: "82%", order: isUser ? -1 : 0 }}>
        <div style={{
          padding: "10px 14px",
          background: isUser ? "var(--blue)" : "var(--bg-card)",
          border: isUser ? "none" : "1px solid var(--border)",
          borderLeft: isUser ? "none" : "2px solid var(--blue)",
          borderRadius: isUser ? "12px 3px 12px 12px" : "3px 12px 12px 12px",
          color: isUser ? "#0f0f0f" : "var(--text-primary)",
          fontSize: 14, lineHeight: 1.55,
          fontFamily: "'Inter', sans-serif",
        }}>
          {isUser ? (
            <div>
              {message.images && message.images.length > 0 && (
                <div style={{ display: "flex", gap: 6, marginBottom: message.content ? 8 : 0, flexWrap: "wrap" }}>
                  {message.images.map((url, i) => (
                    <img key={i} src={url} alt="" style={{
                      width: 80, height: 80, borderRadius: 6, objectFit: "cover",
                      border: "1px solid rgba(0,0,0,0.2)",
                    }} />
                  ))}
                </div>
              )}
              {message.content && (
                <p style={{ margin: 0, fontWeight: 500 }}>{message.content}</p>
              )}
            </div>
          ) : (
            <ReactMarkdown
              className="st-prose"
              components={{
                p:    ({ children }) => <p>{children}</p>,
                ul:   ({ children }) => <ul>{children}</ul>,
                ol:   ({ children }) => <ol>{children}</ol>,
                li:   ({ children }) => <li>{children}</li>,
                h1:   ({ children }) => <h1>{children}</h1>,
                h2:   ({ children }) => <h2>{children}</h2>,
                h3:   ({ children }) => <h3>{children}</h3>,
                code: ({ children }) => <code>{children}</code>,
                hr:   () => <hr />,
                strong: ({ children }) => <strong>{children}</strong>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
      </div>

      {/* Tech avatar */}
      {isUser && (
        <div style={{
          flexShrink: 0, width: 32, height: 32, borderRadius: 6,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginTop: 2, fontSize: 15,
        }}>
          👤
        </div>
      )}
    </div>
  );
}
