import { reshape } from 'arabic-reshaper';
import bidi from 'bidi-js';

// Initialize bidi
const bidiEngine = bidi();

/**
 * Reshapes and handles BiDi for Arabic text to render properly in 
 * environments without advanced text shaping (like docx or react-pdf)
 */
export function processArabicText(text: string): string {
  if (!/[\u0600-\u06FF]/.test(text)) return text;
  
  try {
    // 1. Reshape joining characters
    const reshaped = reshape(text);
    
    // 2. Handle BiDi (Right-to-Left)
    // We get the embedding levels and then reorder the characters
    const bidiResult = bidiEngine.getReorderedText(reshaped);
    
    return bidiResult;
  } catch (err) {
    console.error("Arabic shaping error", err);
    return text;
  }
}
