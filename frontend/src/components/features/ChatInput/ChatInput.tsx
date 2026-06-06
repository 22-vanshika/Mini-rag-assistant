import type { KeyboardEvent, ChangeEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface ChatInputProps {
  question: string;
  setQuestion: (val: string) => void;
  onQuery: () => void;
  documentIngested: boolean;
  isQuerying: boolean;
}

export default function ChatInput({
  question,
  setQuestion,
  onQuery,
  documentIngested,
  isQuerying,
}: ChatInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onQuery();
    }
  };

  return (
    <div className="p-4 border-t border-border bg-background">
      <div className="max-w-3xl mx-auto w-full flex items-center space-x-3">
        <Input
          type="text"
          value={question}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!documentIngested || isQuerying}
          placeholder="Ask any question about the document..."
          className="flex-1 rounded-xl h-11 text-sm bg-muted/30 border-border/60 focus:bg-background transition-all"
        />
        <Button
          size="icon"
          onClick={onQuery}
          disabled={!documentIngested || isQuerying || !question.trim()}
          className="rounded-xl h-11 w-11 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shrink-0"
          aria-label="Send Message"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
