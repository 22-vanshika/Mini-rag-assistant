import type { Message } from "../../../types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/Accordion";
import { Card } from "@/components/ui/Card";
import { BookOpen } from "lucide-react";

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} w-full`}>
      <div
        className={`max-w-[92%] md:max-w-[85%] px-4 py-2.5 rounded-2xl ${isUser
          ? "bg-primary text-primary-foreground font-medium"
          : "bg-card border border-border text-card-foreground shadow-xs"
          } text-sm leading-relaxed`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>

      {!isUser && message.citations && message.citations.length > 0 && (
        <div className="mt-2 w-full max-w-[92%] md:max-w-[85%]">
          <Accordion className="w-full">
            <AccordionItem value="citations" className="border border-border/50 rounded-xl bg-muted/20 px-3">
              <AccordionTrigger className="text-xs text-muted-foreground hover:text-foreground hover:no-underline py-2.5 flex items-center gap-1.5 font-medium">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                Sources ({message.citations.length})
              </AccordionTrigger>
              <AccordionContent className="space-y-2.5 pt-1 pb-3">
                {message.citations.map((cite, cidx) => (
                  <Card key={cidx} className="p-3 bg-card border border-border/50 shadow-none rounded-lg">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Source {cidx + 1}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${cite.score >= 0.3 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                          "bg-muted text-muted-foreground border-border/50"
                        }`}>
                        Score: {cite.score.toFixed(3)}
                      </span>
                    </div>
                    {/* User's backend schemas return `chunk` instead of `text` */}
                    <p className="text-[11px] text-muted-foreground leading-relaxed break-words font-sans">{cite.chunk}</p>
                  </Card>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </div>
  );
}
