import { FileSearch } from "lucide-react";
import ChatMessage from "../ChatMessage";
import ChatInput from "../ChatInput";
import TypingIndicator from "../../feedback/TypingIndicator";
import { useAppStore } from "../../../store";
import { useRef, useEffect } from "react";

export default function ChatInterface() {
  const {
    sessions,
    activeSessionId,
    isQuerying,
    question,
    setQuestion,
    handleQuery,
  } = useAppStore();

  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Find current session data from activeSessionId
  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const documentIngested = activeSession?.documentIngested || false;
  const messages = activeSession?.messages || [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isQuerying]);

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-background relative">
      <div className="flex-grow overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          {!documentIngested && (
            <div className="min-h-[350px] flex flex-col items-center justify-center text-center p-6 animate-in fade-in zoom-in-95 duration-200">
              <FileSearch className="w-12 h-12 text-muted-foreground/85 mb-4 animate-pulse" />
              <h2 className="text-lg font-semibold tracking-tight text-foreground mb-1.5">Awaiting Document</h2>
              <p className="text-muted-foreground text-xs max-w-xs leading-relaxed">
                Please ingest a document using the panel on the right to activate the RAG chat assistant.
              </p>
            </div>
          )}

          {messages.length === 0 && documentIngested && (
            <div className="min-h-[300px] flex items-center justify-center text-muted-foreground text-sm">
              Document ingested successfully. Ask a question to begin!
            </div>
          )}

          {messages.map((msg, idx) => (
            <ChatMessage key={idx} message={msg} />
          ))}

          {isQuerying && <TypingIndicator />}

          <div ref={chatEndRef} />
        </div>
      </div>

      <ChatInput
        question={question}
        setQuestion={setQuestion}
        onQuery={handleQuery}
        documentIngested={documentIngested}
        isQuerying={isQuerying}
      />
    </div>
  );
}
