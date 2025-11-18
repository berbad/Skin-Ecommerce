"use client";
import { useState } from "react";
import { API_URL } from "@/lib/config";
export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    []
  );

  const [input, setInput] = useState("");
  const maxLength = 300;

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Try again later.",
        },
      ]);
    }
  };

  return (
    <>
      <button
        className="fixed bottom-4 right-4 z-50 p-3 bg-blue-600 text-white rounded-full shadow-lg"
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
            <input
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
