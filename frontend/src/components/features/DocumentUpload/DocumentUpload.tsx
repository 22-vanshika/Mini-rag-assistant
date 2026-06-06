import { useState, useRef, useEffect, type DragEvent, type ChangeEvent } from "react";
import { FileText, UploadCloud, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useAppStore } from "../../../store";

interface DocumentUploadProps {
  onUploaded?: () => void;
}

export default function DocumentUpload({ onUploaded }: DocumentUploadProps) {
  const {
    handleIngest,
    isIngesting,
    error,
    setError,
    sessions,
    activeSessionId,
  } = useAppStore();

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const documentIngested = activeSession?.documentIngested || false;
  const chunks = activeSession?.chunks || [];

  const [rawText, setRawText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [wasIngesting, setWasIngesting] = useState(false);

  useEffect(() => {
    if (isIngesting) {
      setWasIngesting(true);
    }
  }, [isIngesting]);

  useEffect(() => {
    if (wasIngesting && !isIngesting && documentIngested) {
      onUploaded?.();
      setWasIngesting(false);
    }
  }, [wasIngesting, isIngesting, documentIngested, onUploaded]);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (file: File) => {
    if (file.name.endsWith(".txt")) {
      setSelectedFile(file);
      setRawText("");
      setError(null);
    } else {
      setError("Please upload a TXT file.");
    }
  };

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setRawText(e.target.value);
    if (selectedFile) setSelectedFile(null);
    if (error) setError(null);
  };

  const handleIngestClick = async () => {
    if (!selectedFile && !rawText.trim()) {
      setError("Please provide a file or enter text to ingest.");
      return;
    }
    await handleIngest(selectedFile, rawText);
  };

  if (documentIngested) {
    return (
      <div className="flex flex-col gap-3 h-full text-foreground">
        <div className="flex items-start gap-2 py-2 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="text-xs font-medium leading-relaxed">Document successfully ingested and ready for queries!</span>
        </div>

        <div className="flex flex-col gap-2 flex-grow min-h-0">
          <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Document Chunks ({chunks.length})
          </div>

          <div className="flex-grow overflow-y-auto pr-1 space-y-2 min-h-0 pb-2">
            {chunks.map((chunk, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-border bg-card text-card-foreground shadow-xs text-xs leading-relaxed text-muted-foreground font-sans whitespace-pre-wrap break-words"
              >
                {chunk}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-transparent">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">Upload Document</h1>
          <p className="text-xs text-muted-foreground">Upload a text file to start chatting.</p>
        </div>
      </div>

      <div className="flex-grow flex flex-col gap-4">
        <div
          className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer ${isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-accent/50"
            }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileChange(e.target.files[0]);
              }
            }}
            accept=".txt"
            className="hidden"
          />

          <div className="flex flex-col items-center gap-2.5">
            <div className="p-2.5 bg-primary/10 rounded-full text-primary">
              {selectedFile ? <FileText className="w-6 h-6" /> : <UploadCloud className="w-6 h-6" />}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {selectedFile ? selectedFile.name : "Select a document"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Drag and drop or click to browse (TXT)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="flex-1 h-px bg-border"></div>
          <span className="text-[9px] font-semibold uppercase tracking-wider">OR PASTE TEXT</span>
          <div className="flex-1 h-px bg-border"></div>
        </div>

        <Textarea
          placeholder="Paste your document text here..."
          className="flex-grow min-h-[100px] text-xs resize-none bg-background focus-visible:ring-primary/50"
          value={rawText}
          onChange={handleTextChange}
        />

        {error && (
          <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20 font-medium">
            {error}
          </div>
        )}

        <Button
          onClick={handleIngestClick}
          disabled={(!selectedFile && !rawText.trim()) || isIngesting}
          className="w-full py-4 text-xs font-medium shadow-sm transition-all cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
          size="lg"
        >
          {isIngesting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="animate-spin h-3.5 w-3.5" />
              Processing...
            </span>
          ) : (
            "Start Chatting"
          )}
        </Button>
      </div>
    </div>
  );
}
