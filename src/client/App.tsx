import React, { useCallback, useRef, useState } from "react";
import ChatHistory from "./components/ChatHistory";
import Header from "./components/Header";
import ChatView from "./components/ChatView";
import GitView from "./components/GitView";
import SettingsView from "./components/SettingsView";
import ChatPreviewModal from "./components/ChatPreviewModal";

import { useModels } from "./hooks/useModels";
import { useChatHistory } from "./hooks/useChatHistory";
import { useChat } from "./hooks/useChat";

import { Chat } from "../types/chat";
import { GitEntry } from "../types/git";

/**
 * The main entry point for the React application.
 * Manages chat state, Git operations, and application views.
 */
export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [status, setStatus] = useState<{ color: "gray" | "yellow" | "green" | "red"; text: string }>({ color: "gray", text: "Ready" });
  const [inputValue, setInputValue] = useState("");
  const { messages, setMessages, sending, handleCancel, sendMessage, sendAnalysisRequest } = useChat();
  const [chatHistory, setChatHistory, saveChat] = useChatHistory();
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentViewedChat, setCurrentViewedChat] = useState<Chat | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const analyzeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [currentTab, setCurrentTab] = useState<"chat" | "git" | "settings">("git");
  const [gitEntries, setGitEntries] = useState<GitEntry[]>([]);
  const [commitLog, setCommitLog] = useState<any[]>([]);
  // Selection of commits (by oid) for AI analysis
  const [selectedCommitOids, setSelectedCommitOids] = useState<Set<string>>(() => new Set());
  // Git tab loading state (disables all controls and shows overlay)
  const [gitLoading, setGitLoading] = useState(false);
  // LLM model selection for analysis
  const { models, selectedModel, setSelectedModel } = useModels(currentTab === 'settings' ? 'chat' : currentTab);

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
      saveChat(currentChatId, messages.map((m) => ({ role: m.role, content: m.content })));
    }
    setMessages([]);
    setCurrentChatId(String(Date.now()));
    updateStatus("Ready", "gray");
  }, [messages, currentChatId, updateStatus, saveChat, setMessages]);

  // helper to save current chat into history
  const saveCurrentChat = useCallback(() => {
    if (messages.length === 0 || !currentChatId) return;
    saveChat(currentChatId, messages.map((m) => ({ role: m.role, content: m.content })));
  }, [messages, currentChatId, saveChat]);

  const handleSend = useCallback(() => {
    const userInput = inputValue.trim();
    if (!userInput || sending) return;

    if (!currentChatId) setCurrentChatId(String(Date.now()));
    
    sendMessage(
      userInput,
      () => setInputValue(""),
      updateStatus,
      scrollToBottom
    );
  }, [inputValue, sending, currentChatId, sendMessage, updateStatus, scrollToBottom]);

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

    sendAnalysisRequest(
      userMsg,
      { commits: forAnalysis, model: selectedModel, maxCommits: 100 },
      updateStatus,
      scrollToBottom
    );
  }, [commitLog, selectedCommitOids, selectedModel, currentChatId, sendAnalysisRequest, updateStatus, scrollToBottom]);

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
        <Header
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          status={status}
          onNewChat={startNewChat}
          onToggleSidebar={() => setSidebarOpen((s) => !s)}
        />

        {/* Main content switcher */}
        {currentTab === 'chat' && (
          <ChatView
            messages={messages}
            inputValue={inputValue}
            setInputValue={setInputValue}
            sending={sending}
            onSend={handleSend}
            onCancel={handleCancel}
            chatContainerRef={chatContainerRef}
          />
        )}
        {currentTab === 'git' && (
          <GitView
            gitLoading={gitLoading}
            updateStatus={updateStatus}
            setGitEntries={setGitEntries}
            setCommitLog={setCommitLog}
            setSelectedCommitOids={setSelectedCommitOids}
            analyzeButtonRef={analyzeButtonRef}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            models={models}
            analyzeCommitsWithAI={analyzeCommitsWithAI}
            sending={sending}
            commitLog={commitLog}
            selectedCommitOids={selectedCommitOids}
            gitEntries={gitEntries}
          />
        )}
        {currentTab === 'settings' && (
          <SettingsView />
        )}
      </div>

      <ChatPreviewModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onContinue={() => {
          if (currentViewedChat?.id) {
            setCurrentChatId(currentViewedChat.id);
            setMessages(currentViewedChat.messages || []);
          }
          setModalOpen(false);
        }}
        chat={currentViewedChat}
      />
    </div>
  );
}
