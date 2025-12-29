import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button from "./components/Button";
import ChatHistory from "./components/ChatHistory";
import GitOperations from "./components/GitOperations";
import GitConsole from "./components/GitConsole";
import CommitList from "./components/CommitList";
import Status from "./components/Status";
import ChatMessage from "./components/ChatMessage";
import Modal from "./components/Modal";


import { Message, Chat } from "../types/chat";
import { GitEntry } from "../types/git";

/**
 * The main entry point for the React application.
 * Manages chat state, Git operations, and application views.
 */
export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [status, setStatus] = useState<{ color: "gray" | "yellow" | "green" | "red"; text: string }>({ color: "gray", text: "Ready" });
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentViewedChat, setCurrentViewedChat] = useState<Chat | null>(null);
  const [sending, setSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const analyzeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [currentTab, setCurrentTab] = useState<"chat" | "git">("chat");
  const [gitEntries, setGitEntries] = useState<GitEntry[]>([]);
  const [commitLog, setCommitLog] = useState<any[]>([]);
  // Selection of commits (by oid) for AI analysis
  const [selectedCommitOids, setSelectedCommitOids] = useState<Set<string>>(() => new Set());
  // Git tab loading state (disables all controls and shows overlay)
  const [gitLoading, setGitLoading] = useState(false);
  // LLM model selection for analysis
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('codellama:latest');

  // Load available LLM models (currently via Ollama) when visiting Git tab
  useEffect(() => {
    const loadModels = async () => {
      try {
        const res = await fetch('/api/ollama/models');
        const data = await res.json();
        if (res.ok && Array.isArray(data?.models)) {
          setModels(data.models);
          // keep selected if still available, else default to codellama or first
          if (data.models.includes(selectedModel)) return;
          if (data.models.includes('codellama:latest')) setSelectedModel('codellama:latest');
          else if (data.models.length > 0) setSelectedModel(data.models[0]);
        }
      } catch (e) {
        // ignore, keep defaults
      }
    };
    if (currentTab === 'git') loadModels();
  }, [currentTab, selectedModel]);

  // Effects to load history from localStorage similar to previous implementation
  useEffect(() => {
    try {
      const saved = localStorage.getItem("chatHistory");
      if (saved) setChatHistory(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
    } catch {}
  }, [chatHistory]);

  const updateStatus = useCallback((text: string, color: "gray" | "yellow" | "green" | "red" = "gray") => setStatus({ text, color }), []);

  const scrollToBottom = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, []);

  const startNewChat = useCallback(() => {
    if (messages.length > 0 && currentChatId) {
      // save current
      setChatHistory((prev) => {
        const existingIndex = prev.findIndex((c) => c.id === currentChatId);
        const chat = { id: currentChatId, messages: messages.map((m) => ({ role: m.role, content: m.content })) };
        if (existingIndex >= 0) {
          const copy = [...prev];
          copy[existingIndex] = chat;
          return copy;
        }
        return [chat, ...prev];
      });
    }
    setMessages([]);
    setCurrentChatId(String(Date.now()));
    updateStatus("Ready", "gray");
  }, [messages, currentChatId, updateStatus]);

  // helper to save current chat into history
  const saveCurrentChat = useCallback(() => {
    if (messages.length === 0 || !currentChatId) return;
    setChatHistory((prev) => {
      const existingIndex = prev.findIndex((c) => c.id === currentChatId);
      const chat = { id: currentChatId, messages: messages.map((m) => ({ role: m.role, content: m.content })) };
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = chat;
        return copy;
      }
      return [chat, ...prev];
    });
  }, [messages, currentChatId]);

  const addMessage = useCallback((role: "user" | "assistant", content: string) => {
    setMessages((prev) => [...prev, { role, content }]);
  }, []);

  const handleSend = useCallback(async () => {
    const userInput = inputValue.trim();
    if (!userInput || sending) return;

    if (!currentChatId) setCurrentChatId(String(Date.now()));
    addMessage("user", userInput);
    setInputValue("");
    setSending(true);
    updateStatus("Sending...", "yellow");

    // Placeholder assistant message index to append stream
    let aiIndex = -1;
    setMessages((prev) => {
      aiIndex = prev.length + 1; // after appending user
      return [...prev, { role: "assistant", content: "" }];
    });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const payload = [...messages, { role: "user", content: userInput }].map((m) => JSON.stringify(m));
      const res = await fetch("/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(res.statusText || "Request failed");
      updateStatus("Streaming...", "yellow");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Streaming not supported");
      const decoder = new TextDecoder();
      let aiText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        aiText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          // find last assistant index
          const idx = copy.findIndex((m, i) => m.role === "assistant" && i >= aiIndex - 1);
          const target = idx >= 0 ? idx : copy.length - 1;
          copy[target] = { ...copy[target], content: aiText };
          return copy;
        });
        scrollToBottom();
      }
      // flush
      const finalChunk = decoder.decode();
      if (finalChunk) {
        const finalText = aiText + finalChunk;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: finalText };
          return copy;
        });
      }
      setSending(false);
      updateStatus("Ready", "green");
      scrollToBottom();
    } catch (e) {
      if (controller.signal.aborted) {
        updateStatus("Cancelled", "yellow");
      } else {
        console.error(e);
        updateStatus("Error", "red");
      }
      setSending(false);
    } finally {
      abortRef.current = null;
    }
  }, [inputValue, sending, messages, currentChatId, addMessage, updateStatus, scrollToBottom]);

  const handleCancel = useCallback(() => {
    const ctrl = abortRef.current;
    if (ctrl) ctrl.abort();
  }, []);

  const analyzeCommitsWithAI = useCallback(async () => {
    if (!Array.isArray(commitLog) || commitLog.length === 0) {
      updateStatus('No commits to analyze', 'yellow');
      return;
    }
    // Filter to selected commits if any are selected
    const selSize = selectedCommitOids.size;
    const forAnalysis = selSize > 0
      ? commitLog.filter((c) => {
          const oid = c?.oid || c?.commit?.oid;
          return oid && selectedCommitOids.has(oid);
        })
      : commitLog;
    if (forAnalysis.length === 0) {
      updateStatus('No selected commits to analyze', 'yellow');
      return;
    }
    // Switch to chat and post a user message describing the action
    setCurrentTab('chat');
    // Build an author list summary from the commit list (use same name resolution as CommitList)
    const authorsArr = Array.from(new Set(
      forAnalysis
        .map((c) => (c?.author?.name || c?.commit?.author?.name || 'Unknown'))
        .map((s) => (typeof s === 'string' ? s.trim() : 'Unknown'))
        .filter((s) => s && s.length > 0)
    ));
    const shown = authorsArr.slice(0, 10);
    const authorsText = shown.join(', ') + (authorsArr.length > 10 ? `, +${authorsArr.length - 10} more` : '');
    const userMsg = `Analyze ${forAnalysis.length} commits (authors: ${authorsText}) with model ${selectedModel}. Provide a summary, risks, and suggested tests.`;
    if (!currentChatId) setCurrentChatId(String(Date.now()));
    addMessage('user', userMsg);

    // Prepare to stream assistant response
    setSending(true);
    updateStatus('Analyzing commits...', 'yellow');

    let aiIndex = -1;
    setMessages((prev) => {
      aiIndex = prev.length + 1; // after appended user
      return [...prev, { role: 'assistant', content: '' }];
    });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/analyze-commits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commits: forAnalysis, model: selectedModel, maxCommits: 100 }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error((await res.text()) || 'Analyze failed');
      updateStatus('Streaming analysis...', 'yellow');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Streaming not supported');
      const decoder = new TextDecoder();
      let aiText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        aiText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          const idx = copy.findIndex((m, i) => m.role === 'assistant' && i >= aiIndex - 1);
          const target = idx >= 0 ? idx : copy.length - 1;
          copy[target] = { ...copy[target], content: aiText };
          return copy;
        });
        scrollToBottom();
      }
      const finalChunk = decoder.decode();
      if (finalChunk) {
        const finalText = aiText + finalChunk;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', content: finalText };
          return copy;
        });
      }
      setSending(false);
      updateStatus('Ready', 'green');
      scrollToBottom();
    } catch (e) {
      if (controller.signal.aborted) {
        updateStatus('Cancelled', 'yellow');
      } else {
        console.error(e);
        updateStatus('Error', 'red');
      }
      setSending(false);
    } finally {
      abortRef.current = null;
    }
  }, [commitLog, selectedCommitOids, selectedModel, currentChatId, addMessage, setMessages, scrollToBottom, updateStatus]);

  // Derived char count
  const charCount = inputValue.length;

  return (
    <div className="flex h-screen">
      {/* Sidebar - only render in Chat tab */}
      {currentTab === 'chat' && (
        <div className={`absolute md:relative z-40 h-full ${sidebarOpen ? "block" : "hidden md:block"}`}>
          <ChatHistory
            chats={chatHistory}
            currentChatId={currentChatId}
            onSelect={(id) => {
              if (currentChatId && id !== currentChatId) saveCurrentChat();
              const chat = chatHistory.find((c) => c.id === id);
              setCurrentChatId(id);
              setMessages(chat?.messages || []);
            }}
            onPreview={(chat) => {
              setCurrentViewedChat(chat);
              setModalOpen(true);
            }}
            onDelete={(id) => {
              setChatHistory((prev) => prev.filter((c) => c.id !== id));
              if (currentChatId === id) {
                setCurrentChatId(null);
                setMessages([]);
              }
            }}
            onNewChat={startNewChat}
          />
        </div>
      )}

      {/* Main */}
      <div className="flex flex-col flex-1 w-full">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Git Review Assistant</h1>
                <p className="text-sm text-gray-500">powered by dankgreywizard</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {currentTab === 'chat' && (
                <>
                  <Button variant="primary" onClick={startNewChat}>
                    <span className="inline-flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>New Chat</span>
                    </span>
                  </Button>
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen((s) => !s)} title="Toggle chat history">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </Button>
                </>
              )}
              <Status color={status.color} text={status.text} />
              {/* Tabs */}
              <nav className="hidden md:flex items-center space-x-2" role="tablist" aria-label="Main tabs">
                <button
                  role="tab"
                  aria-selected={currentTab === 'chat'}
                  className={`px-3 py-1.5 text-sm rounded-lg border ${currentTab === 'chat' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                  onClick={() => setCurrentTab('chat')}
                >
                  Chat
                </button>
                <button
                  role="tab"
                  aria-selected={currentTab === 'git'}
                  className={`px-3 py-1.5 text-sm rounded-lg border ${currentTab === 'git' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                  onClick={() => setCurrentTab('git')}
                >
                  Git
                </button>
              </nav>
            </div>
          </div>
        </header>

        {/* Main content switcher */}
        {currentTab === 'chat' ? (
          <>
            {/* Chat container */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-lg font-medium">Start a conversation</p>
                  <p className="text-sm mt-1">Ask me anything and I'll help you out!</p>
                </div>
              ) : (
                messages.map((m, idx) => <ChatMessage key={idx} role={m.role} content={m.content} />)
              )}
            </div>

            {/* Input area */}
            <div className="bg-white border-t border-gray-200 px-6 py-4">
              <div className="flex items-end space-x-3">
                <div className="flex-1 relative">
                  <textarea
                    rows={1}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type your message here..."
                    className="w-full px-4 py-3 pr-14 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200 bg-gray-50 focus:bg-white"
                    style={{ paddingRight: "3.5rem" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <Button
                    variant="primary"
                    size="icon"
                    className="absolute right-2 bottom-2"
                    onClick={handleSend}
                    disabled={sending || !inputValue.trim()}
                    aria-label="Send message"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </Button>
                </div>
                <Button
                  variant="secondary"
                  onClick={handleCancel}
                  disabled={!sending}
                >
                  Cancel
                </Button>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>Press Enter to send, Shift+Enter for new line</span>
                <span className="text-gray-400">{charCount} characters</span>
              </div>
            </div>
          </>
        ) : (
          // Git tab
          <div className="relative flex-1 overflow-y-auto px-6 py-6 space-y-4">
            {/* Loading overlay */}
            {gitLoading && (
              <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                <div className="flex items-center gap-3 text-gray-700">
                  <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  <span className="text-sm font-medium">Loading…</span>
                </div>
              </div>
            )}
            <GitOperations
              updateStatus={updateStatus}
              onResult={(entry) => setGitEntries((prev) => [...prev, entry])}
              onLogData={(data) => {
                const commits = Array.isArray(data?.commits) ? data.commits : [];
                setCommitLog(commits);
                setSelectedCommitOids(new Set());
                // Focus analyze button after log is loaded
                if (commits.length > 0) {
                  setTimeout(() => {
                    analyzeButtonRef.current?.focus();
                  }, 100);
                }
              }}
              onBusyChange={(v) => setGitLoading(Boolean(v))}
              disabled={gitLoading}
            />
            {/* Model selection and Analyze */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-end gap-3">
              <div className="flex-1 min-w-[12rem]">
                <label className="text-xs text-gray-500 block mb-1">AI Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white"
                  disabled={gitLoading}
                >
                  {models.length === 0 ? (
                    <option value={selectedModel}>{selectedModel}</option>
                  ) : (
                    models.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))
                  )}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  ref={analyzeButtonRef}
                  variant="primary" 
                  onClick={analyzeCommitsWithAI} 
                  disabled={sending || commitLog.length === 0 || gitLoading}
                >
                  {selectedCommitOids.size > 0 ? `Analyze with AI (${selectedCommitOids.size} selected)` : 'Analyze with AI'}
                </Button>
              </div>
            </div>
            <CommitList
              commits={commitLog}
              disabled={gitLoading}
              selectedOids={selectedCommitOids}
              onToggleCommit={(oid, checked) => {
                setSelectedCommitOids((prev) => {
                  const next = new Set(prev);
                  if (checked) next.add(oid); else next.delete(oid);
                  return next;
                });
              }}
              onToggleAllVisible={(oids, checked) => {
                setSelectedCommitOids((prev) => {
                  const next = new Set(prev);
                  for (const o of oids) {
                    if (!o) continue;
                    if (checked) next.add(o); else next.delete(o);
                  }
                  return next;
                });
              }}
            />
            <GitConsole
              entries={gitEntries}
              onClear={() => setGitEntries([])}
            />
          </div>
        )}
      </div>

      {/* Modal for viewing past chats */}
      <Modal
        open={modalOpen}
        title="Chat History"
        onClose={() => setModalOpen(false)}
        onContinue={() => {
          if (currentViewedChat?.id) {
            setCurrentChatId(currentViewedChat.id);
            setMessages(currentViewedChat.messages || []);
          }
          setModalOpen(false);
        }}
      >
        {currentViewedChat?.messages?.length ? (
          <div className="space-y-3">
            {currentViewedChat.messages.map((m, i) => (
              <div key={i} className="text-sm">
                <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">{m.role}</div>
                <div className="whitespace-pre-wrap break-words bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-800">
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-600">No messages to display.</div>
        )}
      </Modal>
    </div>
  );
}
