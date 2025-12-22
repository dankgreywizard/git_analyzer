import React from "react";

export default function ChatHistory({
  chats = [],
  currentChatId,
  onSelect,
  onPreview,
  onDelete,
  onNewChat,
}) {
  return (
    <aside className={`w-64 bg-white border-r border-gray-200 flex flex-col h-full`}>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Chat History</h2>
        <button
          className="px-2 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
          onClick={onNewChat}
          title="Start new chat"
        >
          New
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {chats.length === 0 ? (
          <div className="text-xs text-gray-400 p-2">No saved chats</div>
        ) : (
          chats.map((c) => {
            const title = c.messages?.[0]?.content?.slice(0, 60) || "Chat";
            return (
              <div
                key={c.id}
                className={`group w-full px-3 py-2 rounded-lg border border-transparent hover:bg-gray-50 flex items-center justify-between ${
                  currentChatId === c.id ? "bg-gray-100 border-gray-200" : ""
                }`}
              >
                <button
                  className="flex-1 text-left truncate text-sm text-gray-700"
                  onClick={() => onSelect?.(c.id)}
                  title={title}
                >
                  {title}
                </button>
                <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <button
                    className="px-2 py-1 text-[10px] rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
                    onClick={() => onPreview?.(c)}
                    title="Preview"
                  >
                    View
                  </button>
                  <button
                    className="px-2 py-1 text-[10px] rounded bg-red-100 hover:bg-red-200 text-red-700"
                    onClick={() => onDelete?.(c.id)}
                    title="Delete"
                  >
                    Del
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
