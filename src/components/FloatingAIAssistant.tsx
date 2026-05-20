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
  const [suggestedQuestions, setSuggestedQuestions] = useState(DEFAULT_PROMPTS);
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
      setSuggestedQuestions(
        data.suggested_questions?.length ? data.suggested_questions : DEFAULT_PROMPTS,
      );
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
      setSuggestedQuestions(DEFAULT_PROMPTS);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-end px-4 sm:bottom-6 sm:px-6 lg:bottom-8 lg:px-8">
      <div className="pointer-events-auto flex w-full max-w-[420px] flex-col items-end gap-3">
        <AnimatePresence>
          {isOpen ? (
            <motion.section
              key="panel"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.97 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="w-full overflow-hidden rounded-2xl border border-violet-300/20 bg-[#0B0D17]/[0.92] shadow-[0_24px_90px_rgba(0,0,0,0.5),0_0_70px_rgba(124,58,237,0.18)] backdrop-blur-2xl"
            >
              <div className="border-b border-white/[0.08] bg-white/[0.035] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl border border-cyan-200/20 bg-[radial-gradient(circle_at_35%_25%,rgba(165,243,252,0.8),rgba(167,139,250,0.32)_42%,rgba(11,13,23,0.92)_80%)] text-cyan-50 shadow-[0_0_34px_rgba(34,211,238,0.25)]">
                      <Bot className="size-5" />
                      <span className="absolute -right-1 -top-1 size-3 rounded-full border border-[#0B0D17] bg-violet-300 shadow-[0_0_18px_rgba(196,181,253,0.8)]" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-white">
                          Ruize Lab Sprite
                        </h2>
                        <span className="rounded-full border border-cyan-300/20 bg-cyan-400/[0.08] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100">
                          RAG
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-zinc-400">
                        Ask about Ruize, projects, agents, or this website.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close Ruize Lab Sprite"
                    className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-400 transition hover:border-violet-300/30 hover:bg-white/[0.08] hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <p className="mt-3 rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2 text-xs leading-5 text-zinc-400">
                  An attention-aware agent for navigating projects, reasoning
                  systems, and AI ideas.
                </p>
              </div>

              <div
                ref={scrollerRef}
                className="max-h-[50vh] space-y-3 overflow-y-auto px-4 py-4 sm:max-h-[56vh]"
              >
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={
                      message.role === "user"
                        ? "ml-8 rounded-2xl border border-violet-300/20 bg-violet-300/[0.12] px-3.5 py-3 text-sm leading-6 text-violet-50"
                        : "mr-4 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-3.5 py-3 text-sm leading-6 text-zinc-200"
                    }
                  >
                    {message.role === "assistant" ? (
                      <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-violet-200/70">
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
                            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-400/[0.07] px-2.5 py-1 text-[11px] font-medium text-cyan-100 transition hover:border-cyan-200/40 hover:bg-cyan-400/[0.12]"
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
                            className="rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1 text-left text-[11px] leading-4 text-zinc-300 transition hover:border-violet-300/30 hover:bg-violet-400/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}

                {loading ? (
                  <div className="mr-10 inline-flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-3.5 py-3 text-sm text-zinc-300">
                    <Loader2 className="size-4 animate-spin text-cyan-200" />
                    Reading site knowledge...
                  </div>
                ) : null}
              </div>

              <div className="border-t border-white/[0.08] bg-black/20 px-4 py-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  {suggestedQuestions.slice(0, 3).map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => void sendMessage(question)}
                      disabled={loading}
                      className="rounded-full border border-white/[0.08] bg-white/[0.035] px-2.5 py-1 text-left text-[11px] leading-4 text-zinc-400 transition hover:border-cyan-300/25 hover:bg-cyan-400/[0.07] hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {question}
                    </button>
                  ))}
                </div>
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Ask about Ruize, projects, or AI agents..."
                    className="min-w-0 flex-1 rounded-xl border border-white/[0.1] bg-[#0B0D17]/80 px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-violet-300/35 focus:bg-[#10131F]"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    aria-label="Send message to Ruize Lab Sprite"
                    className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-300 text-[#080A12] transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-50"
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
          className="group relative grid size-16 place-items-center rounded-2xl border border-violet-200/25 bg-[#0B0D17]/85 text-white shadow-[0_18px_60px_rgba(0,0,0,0.45),0_0_46px_rgba(34,211,238,0.16)] backdrop-blur-xl transition hover:border-cyan-200/40 hover:shadow-[0_18px_70px_rgba(0,0,0,0.5),0_0_64px_rgba(124,58,237,0.28)]"
        >
          <span className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(165,243,252,0.35),transparent_42%),radial-gradient(circle_at_70%_80%,rgba(167,139,250,0.36),transparent_48%)] opacity-90" />
          <span className="absolute -right-1 -top-1 size-4 rounded-full border border-[#0B0D17] bg-cyan-200 shadow-[0_0_22px_rgba(103,232,249,0.85)]" />
          <span className="relative grid size-11 place-items-center rounded-xl border border-white/[0.12] bg-white/[0.06]">
            {isOpen ? <X className="size-5" /> : <MessageCircle className="size-5" />}
          </span>
          <span className="pointer-events-none absolute bottom-full right-0 mb-2 hidden w-max max-w-[16rem] rounded-xl border border-white/[0.08] bg-[#0B0D17]/95 px-3 py-2 text-left text-xs leading-5 text-zinc-300 shadow-2xl group-hover:block">
            Ruize Lab Sprite
            <span className="block text-zinc-500">site RAG agent</span>
          </span>
        </motion.button>
      </div>
    </div>
  );
}
