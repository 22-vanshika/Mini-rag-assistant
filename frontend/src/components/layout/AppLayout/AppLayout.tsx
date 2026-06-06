import { useState, useEffect, useRef, type ReactNode } from "react";
import { TopBar } from "../TopBar";
import { Sidebar } from "../Sidebar";
import { useAppStore } from "@/store";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/Resizable";
import { MessageSquare, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import DocumentUpload from "@/components/features/DocumentUpload";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { activeSessionId, sessions, startNewSession, switchSession } = useAppStore();
  const [isCreating, setIsCreating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileDocOpen, setMobileDocOpen] = useState(false);
  const sidebarRef = useRef<any>(null);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // If there are no sessions, automatically default to uploader mode
  useEffect(() => {
    if (sessions.length === 0) {
      setIsCreating(true);
    }
  }, [sessions.length]);

  // If a session becomes active, we are no longer creating
  useEffect(() => {
    if (activeSessionId) {
      setIsCreating(false);
    }
  }, [activeSessionId]);

  // Force layout default size on mount to workaround react-resizable-panels 0-width collapse bug
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sidebarRef.current) {
        try {
          sidebarRef.current.resize("20%");
        } catch (e) {
          console.error("Failed to resize sidebar on mount", e);
        }
      }
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleStartNew = () => {
    startNewSession(); // clear active session
    setIsCreating(true);
  };

  const handleCloseMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  const welcomeView = (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in fade-in duration-200 bg-background text-foreground">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2 shadow-xs">
        <MessageSquare className="w-8 h-8 animate-pulse" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">Welcome to DocuQuery Chat</h2>
      <p className="text-muted-foreground max-w-sm text-xs leading-relaxed">
        {isCreating
          ? "Upload a document or paste text in the workspace panel on the right to start your conversation."
          : "Select a previous chat from the sidebar to continue, or start a new conversation."}
      </p>
      {!isCreating && (
        <Button onClick={handleStartNew} size="sm" className="cursor-pointer shadow-sm rounded-full">
          <Plus className="w-4 h-4 mr-2" />
          Start New Chat
        </Button>
      )}

      {isMobile && !isCreating && sessions.length > 0 && (
        <div className="w-full max-w-xs flex flex-col gap-2 mt-4 animate-in fade-in duration-300">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-left px-1">
            Recent Chats
          </div>
          {sessions.slice(0, 2).map((session) => (
            <button
              key={session.id}
              onClick={() => {
                switchSession(session.id);
                handleCloseMobileSidebar();
              }}
              className="flex items-center gap-3 w-full p-3 rounded-xl border border-border bg-card hover:bg-accent/30 text-left text-sm text-foreground transition-all cursor-pointer shadow-xs"
            >
              <MessageSquare className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate font-medium flex-1">{session.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const mainContent = (
    <div className="h-full flex flex-col relative overflow-hidden bg-background">
      {!activeSessionId ? welcomeView : children}
    </div>
  );

  return (
    <div className="h-dvh w-full flex flex-col overflow-hidden bg-background text-foreground font-sans">
      <TopBar
        showMenuButton={isMobile}
        onToggleSidebar={() => setMobileSidebarOpen(true)}
        showDocButton={isMobile}
        onToggleDoc={() => setMobileDocOpen(true)}
      />

      {isMobile ? (
        <div className="flex-grow w-full relative overflow-hidden flex">
          {/* Main Content Area */}
          <div className="flex-1 h-full overflow-hidden">
            {mainContent}
          </div>

          {/* Mobile Sidebar Backdrop Overlay (Left) */}
          {mobileSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/60 z-40 transition-opacity duration-200"
              onClick={handleCloseMobileSidebar}
            />
          )}

          {/* sliding Sidebar Drawer (Left) */}
          <div
            className="fixed inset-y-0 left-0 w-[280px] bg-card border-r border-border z-50 flex flex-col transition-transform duration-300 ease-in-out"
            style={{ transform: mobileSidebarOpen ? "translateX(0)" : "translateX(-100%)" }}
          >
            <Sidebar
              onNewChat={handleStartNew}
              onCloseMobile={handleCloseMobileSidebar}
            />
          </div>

          {/* Mobile Document Drawer Backdrop Overlay (Right) */}
          {mobileDocOpen && (
            <div
              className="fixed inset-0 bg-black/60 z-40 transition-opacity duration-200"
              onClick={() => setMobileDocOpen(false)}
            />
          )}

          {/* Sliding Document Drawer (Right) */}
          <div
            className="fixed inset-y-0 right-0 w-[280px] sm:w-[320px] bg-card border-l border-border z-50 flex flex-col transition-transform duration-300 ease-in-out"
            style={{ transform: mobileDocOpen ? "translateX(0)" : "translateX(100%)" }}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Document Workspace</span>
              <button
                onClick={() => setMobileDocOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-grow overflow-y-auto p-4 min-h-0 bg-card">
              <DocumentUpload onUploaded={() => setMobileDocOpen(false)} />
            </div>
          </div>
        </div>
      ) : (
        <ResizablePanelGroup
          direction="horizontal"
          className="flex-1 w-full border-t border-border"
        >
          {/* Panel 1: Left Conversations Sidebar */}
          <ResizablePanel
            ref={sidebarRef}
            id="sidebar-panel"
            defaultSize="20%"
            minSize="15%"
            maxSize="30%"
          >
            <div className="h-full bg-card flex flex-col">
              <Sidebar
                onNewChat={handleStartNew}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Panel 2: Center Main Chat Panel */}
          <ResizablePanel
            id="main-content-panel"
            defaultSize="55%"
            minSize="40%"
          >
            {mainContent}
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Panel 3: Right Document Panel */}
          <ResizablePanel
            id="document-panel"
            defaultSize="25%"
            minSize="20%"
            maxSize="40%"
            collapsible
          >
            <div className="h-full bg-card border-l border-border flex flex-col p-4 overflow-hidden">
              <DocumentUpload />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
}
