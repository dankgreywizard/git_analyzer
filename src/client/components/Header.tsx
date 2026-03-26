import React, { useState, useRef, useEffect } from "react";
import Button from "./Button";
import Status from "./Status";

interface HeaderProps {
  currentTab: "chat" | "git" | "settings";
  status: { color: "gray" | "yellow" | "green" | "red"; text: string };
  onNewChat: () => void;
  onToggleSidebar: () => void;
  onShowHistory?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  currentTab,
  status,
  onNewChat,
  onToggleSidebar,
  onShowHistory,
}) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="md:hidden w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 capitalize">{currentTab}</h1>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {currentTab === 'chat' && (
            <>
              <Button variant="secondary" onClick={onShowHistory} title="View past conversations" size="sm">
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="hidden sm:inline">History</span>
                </span>
              </Button>
              <Button variant="secondary" onClick={onNewChat} title="Start a fresh conversation" size="sm">
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">New Chat</span>
                </span>
              </Button>
              <Button variant="ghost" size="icon" className="md:hidden" onClick={onToggleSidebar} title="Toggle menu">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
            </>
          )}
          <Status color={status.color} text={status.text} />
        </div>
      </div>
    </header>
  );
};

export default Header;
