"use client";

import { useState, useRef, useEffect } from "react";
import {
  Header,
  MessageBubble,
  TypingIndicator,
  EmptyState,
  ChatInput,
  ThemeSelector,
  Theme,
} from "./components/chat";
import { useChat } from "@/hooks/useChat";

export default function Home() {
  const { messages, isLoading, sendMessage } = useChat();
  const [input, setInput] = useState("");
  const [theme, setTheme] = useState<Theme>("grey");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    if (newTheme === "grey")
      return document.documentElement.removeAttribute("data-theme");

    document.documentElement.setAttribute("data-theme", newTheme);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    const content = input.trim();
    setInput("");
    await sendMessage(content);
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--bg)] overflow-hidden">
      <Header>
        <ThemeSelector currentTheme={theme} onThemeChange={handleThemeChange} />
      </Header>

      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <div>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isLoading && (
                <div className="py-2 border-b border-[var(--bg-highlight)]">
                  <div className="flex gap-3">
                    <span className="text-[var(--green)]">λ</span>
                    <TypingIndicator />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
