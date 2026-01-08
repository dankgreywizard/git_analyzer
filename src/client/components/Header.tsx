import React, { useState, useRef, useEffect } from "react";
import Button from "./Button";
import Status from "./Status";

interface HeaderProps {
  currentTab: "chat" | "git" | "settings";
  setCurrentTab: (tab: "chat" | "git" | "settings") => void;
  status: { color: "gray" | "yellow" | "green" | "red"; text: string };
  onNewChat: () => void;
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  status,
  onNewChat,
  onToggleSidebar,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTabChange = (tab: "chat" | "git" | "settings") => {
    setCurrentTab(tab);
    setMenuOpen(false);
  };

  return (
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
              <Button variant="primary" onClick={onNewChat}>
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Chat</span>
                </span>
              </Button>
              <Button variant="ghost" size="icon" className="md:hidden" onClick={onToggleSidebar} title="Toggle chat history">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
            </>
          )}
          <Status color={status.color} text={status.text} />
          
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span className="capitalize">{currentTab}</span>
              <svg className={`w-4 h-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="py-1">
                  <button
                    onClick={() => handleTabChange('git')}
                    className={`block w-full text-left px-4 py-2 text-sm ${currentTab === 'git' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    Git
                  </button>
                  <button
                    onClick={() => handleTabChange('chat')}
                    className={`block w-full text-left px-4 py-2 text-sm ${currentTab === 'chat' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    Chat
                  </button>
                  <button
                    onClick={() => handleTabChange('settings')}
                    className={`block w-full text-left px-4 py-2 text-sm ${currentTab === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
