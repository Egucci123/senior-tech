import React, { useState, useRef } from "react";
import { Send, Loader2, Camera, Mic, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ChatInput({ onSend, isLoading }) {
  const [text, setText]           = useState("");
  const [images, setImages]       = useState([]);
  const [uploading, setUploading] = useState(false);
  const [listening, setListening] = useState(false);
  const fileRef = useRef();

  const handleSend = () => {
    if ((!text.trim() && images.length === 0) || isLoading || uploading) return;
    onSend(text.trim(), images.map(i => i.url));
    setText("");
    setImages([]);
  };

  const handleImagePick = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    const preview = URL.createObjectURL(file);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImages(prev => [...prev, { url: file_url, preview }]);
    setUploading(false);
  };

  const handleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input is not supported in this browser. Try Chrome.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    setListening(true);
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setText(prev => prev ? prev + " " + transcript : transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend   = () => setListening(false);
    rec.start();
  };

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));
  const active = (text.trim() || images.length > 0) && !isLoading && !uploading;

  return (
    <div style={{
      background: "rgba(28,27,27,0.95)",
      borderTop: "1px solid rgba(255,255,255,0.05)",
      flexShrink: 0, backdropFilter: "blur(8px)",
    }}>
      {/* Image previews */}
      {images.length > 0 && (
        <div style={{ display: "flex", gap: 8, padding: "8px 12px 0" }}>
          {images.map((img, i) => (
            <div key={i} style={{ position: "relative", flexShrink: 0 }}>
              <img src={img.preview} alt="" style={{
                width: 56, height: 56, borderRadius: 6, objectFit: "cover",
                border: "1px solid var(--border)",
              }} />
              <button onClick={() => removeImage(i)} style={{
                position: "absolute", top: -5, right: -5,
                width: 16, height: 16, borderRadius: "50%",
                background: "var(--red)", border: "none", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", padding: 0,
              }}>
                <X size={9} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* PHOTO + VOICE row */}
      <div style={{ display: "flex", gap: 0, padding: "10px 12px 0" }}>
        <input ref={fileRef} type="file" accept="image/*" capture="environment"
          style={{ display: "none" }} onChange={handleImagePick} />

        <button
          onClick={() => fileRef.current.click()}
          disabled={isLoading || uploading}
          className="btn-press"
          style={{
            flex: 1, height: 48,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRight: "none",
            borderRadius: "6px 0 0 6px",
            color: uploading ? "var(--blue)" : "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          {uploading
            ? <Loader2 size={16} color="var(--blue)" style={{ animation: "spin 1s linear infinite" }} />
            : <Camera size={16} />}
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            {uploading ? "UPLOADING..." : "PHOTO"}
          </span>
        </button>

        <button
          onClick={handleVoice}
          disabled={isLoading || listening}
          className="btn-press"
          style={{
            flex: 1, height: 48,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: listening ? "rgba(79,195,247,0.12)" : "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderLeft: "1px solid var(--border)",
            borderRadius: "0 6px 6px 0",
            color: listening ? "var(--blue)" : "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          <Mic size={16} style={listening ? { animation: "pulseBadge 1s ease-in-out infinite" } : {}} />
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            {listening ? "LISTENING..." : "VOICE"}
          </span>
        </button>
      </div>

      {/* Text input + send */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px 12px",
      }}>
        <div style={{
          flex: 1,
          display: "flex", alignItems: "center",
          background: "var(--bg)", border: "1px solid var(--border)",
          borderRadius: 6, height: 48, padding: "0 14px",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
          onFocusCapture={e => {
            e.currentTarget.style.borderColor = "var(--blue)";
            e.currentTarget.style.boxShadow = "0 0 0 2px rgba(79,195,247,0.12)";
          }}
          onBlurCapture={e => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="DESCRIBE THE ISSUE..."
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "var(--text-primary)", caretColor: "var(--blue)",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 14, fontWeight: 500, letterSpacing: "0.03em",
            }}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!active}
          className="btn-press"
          style={{
            flexShrink: 0, width: 48, height: 48, borderRadius: 6, border: "none",
            background: active ? "var(--blue)" : "var(--bg-elevated)",
            color: active ? "#0f0f0f" : "var(--text-muted)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: active ? "pointer" : "not-allowed",
            boxShadow: active ? "0 0 14px rgba(79,195,247,0.3)" : "none",
            transition: "all 0.15s",
          }}
        >
          {isLoading
            ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            : <Send size={18} strokeWidth={2} />}
        </button>
      </div>
    </div>
  );
}
