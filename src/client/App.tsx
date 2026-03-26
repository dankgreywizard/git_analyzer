import React, { useCallback, useRef, useState } from "react";
import ChatHistory from "./components/ChatHistory";
import HistoryModal from "./components/HistoryModal";
import Header from "./components/Header";
import ChatView from "./components/ChatView";
import GitView from "./components/GitView";
import SettingsView from "./components/SettingsView";
import ChatPreviewModal from "./components/ChatPreviewModal";
import Layout from "./components/Layout";
import SidebarNav from "./components/SidebarNav";

import { useModels } from "./hooks/useModels";
import { useChatHistory } from "./hooks/useChatHistory";
import { useChat } from "./hooks/useChat";
import { useGit } from "./hooks/useGit";

import { Chat } from "../types/chat";

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
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const analyzeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [currentTab, setCurrentTab] = useState<"chat" | "git" | "settings">("git");
  const [commitLog, setCommitLog] = useState<any[]>([]);
  
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

  const {
    gitEntries,
    setGitEntries,
    selectedCommitOids,
    setSelectedCommitOids,
    gitLoading,
    analyzeCommitsWithAI,
    checkoutSelectedCommits,
    resetRepository,
    setGitLoading,
  } = useGit({
    commitLog,
    selectedModel,
    currentChatId,
    setCurrentChatId,
    setCurrentTab,
    updateStatus,
    sendAnalysisRequest,
    scrollToBottom,
  });

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
    
    setInputValue("");
    sendMessage(
      userInput,
      () => {},
      updateStatus,
      scrollToBottom
    );
  }, [inputValue, sending, currentChatId, sendMessage, updateStatus, scrollToBottom]);

  return (
    <Layout
      nav={
        <SidebarNav currentTab={currentTab} setCurrentTab={setCurrentTab} />
      }
      header={
        <Header
          currentTab={currentTab}
          status={status}
          onNewChat={startNewChat}
          onToggleSidebar={() => setSidebarOpen((s) => !s)}
          onShowHistory={() => setHistoryModalOpen(true)}
        />
      }
      sidebar={undefined}
    >
      {/* Main content switcher */}
      {currentTab === "chat" && (
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
      {currentTab === "git" && (
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
          checkoutSelectedCommits={checkoutSelectedCommits}
          resetRepository={resetRepository}
          setGitLoading={setGitLoading}
          sending={sending}
          commitLog={commitLog}
          selectedCommitOids={selectedCommitOids}
          gitEntries={gitEntries}
        />
      )}
      {currentTab === "settings" && <SettingsView />}

      <ChatPreviewModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onContinue={() => {
          if (currentViewedChat?.id) {
            setCurrentChatId(currentViewedChat.id);
            setMessages(currentViewedChat.messages || []);
          }
          setModalOpen(false);
          setHistoryModalOpen(false);
        }}
        chat={currentViewedChat}
      />

      <HistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
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
    </Layout>
  );
}
