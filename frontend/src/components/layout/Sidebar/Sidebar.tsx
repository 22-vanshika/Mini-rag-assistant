import { useAppStore } from "@/store";
import { Plus, MessageSquare, Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

interface SidebarProps {
  onNewChat: () => void;
  onCloseMobile?: () => void;
}

export function Sidebar({ onNewChat, onCloseMobile }: SidebarProps) {
  const {
    sessions,
    activeSessionId,
    switchSession,
    startNewSession,
    deleteSession,
    renameSession
  } = useAppStore();

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleStartNew = () => {
    startNewSession();
    onNewChat();
  };

  return (
    <div className="w-full bg-card flex flex-col h-full border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between gap-3">
        <h2 className="font-semibold text-sm tracking-tight text-foreground">Conversations</h2>
        <Button
          onClick={handleStartNew}
          size="sm"
          className="flex items-center justify-center gap-1.5 cursor-pointer text-xs h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
        >
          <Plus className="w-3.5 h-3.5" />
          New Chat
        </Button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.length === 0 && (
          <div className="text-center p-8 text-xs text-muted-foreground leading-relaxed">
            No past chats. Click <span className="font-medium text-foreground">New Chat</span> to start!
          </div>
        )}
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => {
              if (editingSessionId !== session.id) {
                switchSession(session.id);
                onCloseMobile?.();
              }
            }}
            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors group ${
              activeSessionId === session.id
                ? "bg-accent/40 text-accent-foreground border border-accent/20"
                : "hover:bg-accent/10 text-muted-foreground border border-transparent"
            }`}
          >
            {editingSessionId === session.id ? (
              <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      renameSession(session.id, editName);
                      setEditingSessionId(null);
                    } else if (e.key === "Escape") {
                      setEditingSessionId(null);
                    }
                  }}
                  autoFocus
                  className="bg-background text-foreground border border-border rounded px-2 py-0.5 text-xs w-full focus:outline-hidden focus:ring-1 focus:ring-primary min-w-0"
                />
                <button
                  onClick={() => {
                    renameSession(session.id, editName);
                    setEditingSessionId(null);
                  }}
                  className="text-emerald-500 hover:text-emerald-600 p-0.5 cursor-pointer shrink-0"
                  title="Save Name"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingSessionId(null)}
                  className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer shrink-0"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                  <MessageSquare className="w-4 h-4 flex-shrink-0 text-primary" />
                  <span className="text-xs font-medium truncate">
                    {session.name}
                  </span>
                </div>
                <div className="flex items-center shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSessionId(session.id);
                      setEditName(session.name);
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1 opacity-0 group-hover:opacity-100 mr-0.5 cursor-pointer"
                    title="Rename Chat"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Delete Chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
