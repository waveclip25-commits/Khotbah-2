import localforage from 'localforage';

const FONT_CACHE_KEY = 'khotbah_ai_font_cache';

interface FontCache {
  [key: string]: string; // URL as key, Base64/Blob URL as value
}

/**
 * Downloads a font from a URL and saves it to IndexedDB
 */
export const preloadFont = async (name: string, url: string): Promise<string> => {
  try {
    // 1. Check if font is already in cache
    const cache = await localforage.getItem<FontCache>(FONT_CACHE_KEY) || {};
    
    if (cache[name]) {
      // Basic validation: Is it longer than a few bytes and not a 404 page in disguise?
      if (cache[name].length > 1000 && !cache[name].startsWith('data:text/html')) {
        console.log(`Font ${name} loaded from local cache.`);
        return cache[name];
      } else {
        console.warn(`Font ${name} in cache seems corrupted. Re-downloading...`);
        delete cache[name];
      }
    }

    console.log(`Downloading font ${name} from ${url}...`);
    
    // 2. Fetch the font with cache-busting to avoid stale 404s
    const response = await fetch(`${url}?v=${Date.now()}`);
    if (!response.ok) throw new Error(`Failed to fetch font: ${response.status} ${response.statusText}`);
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      throw new Error(`Received HTML instead of font for ${name}. Check URL.`);
    }

    const blob = await response.blob();
    if (blob.size < 5000) { // Most fonts are at least 5KB
      throw new Error(`Font blob for ${name} is too small (${blob.size} bytes).`);
    }
    
    // 3. Convert blob to Base64 to store in IndexedDB
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        
        // Save to cache
        cache[name] = base64data;
        await localforage.setItem(FONT_CACHE_KEY, cache);
        
        console.log(`Font ${name} successfully cached locally.`);
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Font preloading failed for ${name}:`, error);
    // If it's a 404 or corrupted, we MUST NOT return the same bad URL 
    // because react-pdf will just fail again with the same error.
    return url; 
  }
};

/**
 * Gets a font from cache or returns original URL
 */
export const getCachedFont = async (name: string, fallbackUrl: string): Promise<string> => {
  const cache = await localforage.getItem<FontCache>(FONT_CACHE_KEY) || {};
  return cache[name] || fallbackUrl;
};
