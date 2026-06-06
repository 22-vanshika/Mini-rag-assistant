/**
 * Simple client-side text chunker that matches the backend logic.
 * This allows displaying the chunks visually in the frontend.
 */
export function chunkTextLocal(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50
): string[] {
  if (!text || text.trim() === "") return [];
  
  const chunks: string[] = [];
  let index = 0;
  
  // Standard sliding window chunker
  while (index < text.length) {
    const chunk = text.slice(index, index + chunkSize);
    chunks.push(chunk);
    
    index += chunkSize - overlap;
    
    // Safety check to prevent infinite loop
    if (chunkSize - overlap <= 0) {
      break;
    }
  }
  
  return chunks;
}
