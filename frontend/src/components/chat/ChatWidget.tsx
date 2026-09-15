"use client";
import { useState } from "react";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    [],
  );

  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const maxLength = 300;

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    setError("");

    const newMessages = [...messages, { role: "user", content: input }].slice(
      -10,
    );
    setMessages(newMessages);
    setInput("");

    try {
      const res = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      if (typeof data.reply !== "string") throw new Error();
      setMessages((prev) => [
        ...prev.slice(-19),
        { role: "assistant", content: data.reply },
      ]);
    } catch {
      setError(
        "Chat is unavailable or has reached its limit. Please try again later.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        className="fixed bottom-4 right-4 z-50 p-3 bg-blue-600 text-white rounded-full shadow-lg"
        aria-label="Toggle skincare chat"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        💬
      </button>

      {isOpen && (
        <div className="fixed bottom-20 right-4 w-80 h-96 bg-white dark:bg-gray-900 border border-gray-300 rounded-lg shadow-lg flex flex-col overflow-hidden z-50">
          <div className="p-2 text-sm font-bold text-center border-b dark:border-gray-700">
            Skincare Chatbot
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 text-sm">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`text-${msg.role === "user" ? "right" : "left"}`}
              >
                <div
                  className={`inline-block px-3 py-2 rounded-lg ${
                    msg.role === "user"
                      ? "bg-blue-100 dark:bg-blue-800"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t dark:border-gray-700">
            {error && (
              <p role="alert" className="text-sm">
                {error}
              </p>
            )}
            {sending && <p role="status">Sending…</p>}
            <input
              aria-label="Chat message"
              disabled={sending}
              maxLength={maxLength}
              className="w-full px-3 py-1 rounded bg-gray-100 dark:bg-gray-800 text-sm"
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <p className="text-xs text-right text-gray-400">
              {input.length}/{maxLength}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
