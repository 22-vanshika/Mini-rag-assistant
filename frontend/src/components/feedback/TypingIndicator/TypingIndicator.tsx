export default function TypingIndicator() {
  return (
    <div className="flex items-start w-full">
      <div className="max-w-[85%] px-4 py-3 bg-card rounded-2xl border border-border text-card-foreground shadow-xs">
        <div className="flex space-x-1.5 items-center h-5">
          <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
          <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
          <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
        </div>
      </div>
    </div>
  );
}
