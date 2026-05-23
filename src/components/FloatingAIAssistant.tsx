"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  ExternalLink,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";

type ChatRole = "user" | "assistant";

type SiteAgentSource = {
  title: string;
  url: string;
  type: string;
};

type SiteAgentApiResponse = {
  answer?: string;
  intent?: string;
  sources?: SiteAgentSource[];
  limitations?: string[];
  suggested_questions?: string[];
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  intent?: string;
  sources?: SiteAgentSource[];
  limitations?: string[];
  suggestedQuestions?: string[];
};

const DEFAULT_PROMPTS = [
  "What is Ruize's strongest AI agent project?",
  "Explain Ruize's view on AI agents.",
  "How is the biomedical project different from a normal chatbot?",
  "Why does the NBA project need tools?",
  "Which project should I open first?",
  "What does responsible AI mean in these projects?",
];

const UNAVAILABLE_MESSAGE =
  "The AI assistant is temporarily unavailable. Please try again soon.";

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getApiBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
  return baseUrl.replace(/\/$/, "");
}

function sourceIsExternal(url: string) {
  return /^https?:\/\//i.test(url);
}

export function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi, I am Ruize Lab Sprite. Ask me about Ruize, the featured systems, research experience, or why these projects treat agents as evidence-aware workflows.",
      suggestedQuestions: DEFAULT_PROMPTS.slice(0, 3),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const apiBaseUrl = useMemo(getApiBaseUrl, []);

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading, isOpen]);

  async function sendMessage(nextMessage?: string) {
    const text = (nextMessage ?? input).trim();
    if (!text || loading) {
      return;
    }

    const history = messages
      .filter((message) => message.id !== "welcome")
      .slice(-8)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    const userMessage: ChatMessage = {
      id: createId("user"),
      role: "user",
      content: text,
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/site-agent/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          history,
          mode: "site",
        }),
      });

      if (!response.ok) {
        throw new Error(`Site agent request failed with ${response.status}`);
      }

      const data = (await response.json()) as SiteAgentApiResponse;
      const assistantMessage: ChatMessage = {
        id: createId("assistant"),
        role: "assistant",
        content: data.answer?.trim() || UNAVAILABLE_MESSAGE,
        intent: data.intent,
        sources: data.sources ?? [],
        limitations: data.limitations ?? [],
        suggestedQuestions: data.suggested_questions ?? [],
      };

      setMessages([...nextMessages, assistantMessage]);
    } catch {
      setMessages([
        ...nextMessages,
        {
          id: createId("assistant-error"),
          role: "assistant",
          content: UNAVAILABLE_MESSAGE,
          limitations: ["The backend request did not complete successfully."],
          suggestedQuestions: DEFAULT_PROMPTS.slice(0, 2),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-end px-4 sm:bottom-6 sm:px-6 lg:px-8">
      <div className="pointer-events-auto flex w-[min(92vw,380px)] flex-col items-end gap-3 sm:w-[380px]">
        <AnimatePresence>
          {isOpen ? (
            <motion.section
              key="panel"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.97 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              style={{ maxHeight: "min(560px, calc(100dvh - 112px))" }}
              className="sprite-panel flex w-full flex-col overflow-hidden rounded-2xl border backdrop-blur-2xl"
            >
              <div className="sprite-panel-bar shrink-0 border-b px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="sprite-orb relative grid size-11 shrink-0 place-items-center rounded-2xl border">
                      <Bot className="size-5" />
                      <span className="absolute -right-1 -top-1 size-3 rounded-full border border-[color:var(--surface-elevated)] bg-[var(--accent-secondary)] shadow-[0_0_18px_var(--accent-secondary)]" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-[var(--text)]">
                          Ruize Lab Sprite
                        </h2>
                        <span className="sprite-chip rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]">
                          RAG
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close Ruize Lab Sprite"
                    className="sprite-card grid size-8 shrink-0 place-items-center rounded-lg border transition hover:border-[color:var(--accent)]"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <p className="sprite-card sprite-muted mt-3 rounded-xl border px-3 py-2 text-xs leading-5">
                  An attention-aware agent for navigating projects, reasoning
                  systems, and AI ideas.
                </p>
              </div>

              <div
                ref={scrollerRef}
                className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
              >
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={
                      message.role === "user"
                        ? "ml-8 rounded-2xl border border-[color:var(--chip-border)] bg-[var(--accent-soft)] px-3.5 py-3 text-sm leading-6 text-[var(--text)]"
                        : "sprite-card mr-4 rounded-2xl border px-3.5 py-3 text-sm leading-6"
                    }
                  >
                    {message.role === "assistant" ? (
                      <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
                        <Sparkles className="size-3" />
                        {message.intent ?? "site agent"}
                      </div>
                    ) : null}
                    <p className="whitespace-pre-wrap">{message.content}</p>

                    {message.sources?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.sources.map((source) => (
                          <a
                            key={`${source.title}-${source.url}`}
                            href={source.url}
                            target={sourceIsExternal(source.url) ? "_blank" : undefined}
                            rel={sourceIsExternal(source.url) ? "noreferrer" : undefined}
                            className="sprite-chip inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition hover:border-[color:var(--accent)]"
                          >
                            <span className="truncate">{source.title}</span>
                            {sourceIsExternal(source.url) ? (
                              <ExternalLink className="size-3 shrink-0" />
                            ) : null}
                          </a>
                        ))}
                      </div>
                    ) : null}

                    {message.limitations?.length ? (
                      <div className="mt-3 rounded-xl border border-amber-200/10 bg-amber-300/[0.045] px-3 py-2">
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-100/70">
                          Limitations
                        </p>
                        <ul className="mt-1 space-y-1 text-xs leading-5 text-amber-50/75">
                          {message.limitations.slice(0, 3).map((limitation) => (
                            <li key={limitation}>{limitation}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {message.suggestedQuestions?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.suggestedQuestions.slice(0, 3).map((question) => (
                          <button
                            key={question}
                            type="button"
                            onClick={() => void sendMessage(question)}
                            disabled={loading}
                            className="sprite-chip rounded-full border px-2.5 py-1 text-left text-[11px] leading-4 transition hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}

                {loading ? (
                  <div className="sprite-card mr-10 inline-flex items-center gap-2 rounded-2xl border px-3.5 py-3 text-sm">
                    <Loader2 className="size-4 animate-spin text-[var(--accent)]" />
                    Reading site knowledge...
                  </div>
                ) : null}
              </div>

              <div className="sprite-panel-bar shrink-0 border-t px-4 py-4">
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Ask about Ruize, projects, or AI agents..."
                    className="sprite-input min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:border-[color:var(--accent)]"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    aria-label="Send message to Ruize Lab Sprite"
                    className="sprite-primary-button grid size-10 shrink-0 place-items-center rounded-xl transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                  </button>
                </form>
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-label="Open Ruize Lab Sprite"
          aria-expanded={isOpen}
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.98 }}
          className="sprite-orb group relative grid size-16 place-items-center rounded-2xl border backdrop-blur-xl transition hover:border-[color:var(--accent-secondary)]"
        >
          <span className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.24),transparent_42%),radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.16),transparent_48%)] opacity-90" />
          <span className="absolute -right-1 -top-1 size-4 rounded-full border border-[color:var(--surface-elevated)] bg-[var(--accent-secondary)] shadow-[0_0_22px_var(--accent-secondary)]" />
          <span className="relative grid size-11 place-items-center rounded-xl border border-white/20 bg-white/15">
            {isOpen ? <X className="size-5" /> : <MessageCircle className="size-5" />}
          </span>
          <span className="sprite-panel pointer-events-none absolute bottom-full right-0 mb-2 hidden w-max max-w-[16rem] rounded-xl border px-3 py-2 text-left text-xs leading-5 group-hover:block">
            Ruize Lab Sprite
            <span className="sprite-muted block">site RAG agent</span>
          </span>
        </motion.button>
      </div>
    </div>
  );
}
