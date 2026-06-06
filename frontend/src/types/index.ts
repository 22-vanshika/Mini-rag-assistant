export type Citation = {
  chunk: string;
  score: number;
};

export type Message = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

export interface ChatSession {
  id: string;
  name: string;
  documentIngested: boolean;
  chunks_stored: number;
  chunks: string[];
  messages: Message[];
  createdAt: number;
}
