import type { DictionaryEntry, LookupResult } from '../types';
import { CHINESE_VIETNAMESE_LEXICON } from '../data/chineseDictData';
import { getHanViet as getHanVietFromService, getPinyin as getPinyinFromService } from './hanvietService';
// @ts-ignore
import { tify } from 'chinese-conv';

export interface IDictionaryService {
  lookupExact(word: string): Promise<DictionaryEntry | null>;
  lookupWordAt(fullText: string, charIndex: number): Promise<LookupResult | null>;
  getHanViet(text: string): string;
  getPinyin(text: string): string;
  segmentText(text: string): string[];
  translateDirect(text: string): Promise<{ translation: string; alternatives: string[] }>;
}

// Regex matching CJK Unified Ideographs
const CHINESE_CHAR_REGEX = /[\u4e00-\u9fa5]/;

export class DictionaryService implements IDictionaryService {
  private entryCache = new Map<string, DictionaryEntry>();
  private inFlightRequests = new Map<string, Promise<DictionaryEntry | null>>();
  private maxCacheSize = 1000;
  private segmenter: Intl.Segmenter | null = null;

  constructor() {
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      try {
        this.segmenter = new Intl.Segmenter('zh', { granularity: 'word' });
      } catch (err) {
        console.warn('Intl.Segmenter not supported for zh locale:', err);
      }
    }
  }

  /**
   * Derive Sino-Vietnamese (Âm Hán Việt) pronunciation for any Chinese text
   * Powered by hanviet-pinyin-words with 10,540+ characters
   */
  public getHanViet(text: string): string {
    return getHanVietFromService(text);
  }

  /**
   * Get accurate Pinyin with standard tone marks for any Chinese text
   */
  public getPinyin(text: string): string {
    return getPinyinFromService(text);
  }

  /**
   * Segment Chinese text into word tokens using Intl.Segmenter + dictionary rules
   */
  public segmentText(text: string): string[] {
    if (this.segmenter) {
      const segments = Array.from(this.segmenter.segment(text));
      return segments.map((s) => s.segment);
    }
    return Array.from(text);
  }

  /**
   * Real-time online translation engine (Google Translate free endpoint)
   * Fetches accurate Vietnamese translation and alternatives for any Chinese text
   */
  public async translateDirect(text: string): Promise<{ translation: string; alternatives: string[] }> {
    if (!text || !text.trim()) {
      return { translation: '', alternatives: [] };
    }

    const clean = text.trim();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=vi&dt=t&dt=bd&dt=rm&dt=at&q=${encodeURIComponent(clean)}`;

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Translation HTTP error ${response.status}`);
      }

      const data = await response.json();

      // 1. Primary sentence / phrase translation
      const mainTranslation =
        data[0]?.map((item: any) => item?.[0]).filter(Boolean).join('') || '';

      // 2. Alternative meanings from dt=at
      const alternatives: string[] = [];
      if (data[5] && data[5][0] && data[5][0][2]) {
        for (const alt of data[5][0][2]) {
          if (alt[0] && typeof alt[0] === 'string') {
            alternatives.push(alt[0].trim());
          }
        }
      }

      // 3. Dictionary entries from dt=bd if present
      if (data[1] && Array.isArray(data[1])) {
        for (const group of data[1]) {
          if (group[1] && Array.isArray(group[1])) {
            for (const term of group[1]) {
              if (typeof term === 'string') {
                alternatives.push(term.trim());
              }
            }
          }
        }
      }

      return {
        translation: mainTranslation,
        alternatives: Array.from(new Set(alternatives)).filter(
          (m) => m && m.toLowerCase() !== mainTranslation.toLowerCase()
        ),
      };
    } catch (err) {
      console.warn('Direct translation error (falling back to offline data):', err);
      return { translation: '', alternatives: [] };
    }
  }

  /**
   * Exact lookup for any Chinese word, compound, or phrase
   * Combines:
   * 1. Direct translation engine (unlimited vocabulary)
   * 2. Accurate tone-marked Pinyin (pinyin-pro)
   * 3. Comprehensive Hán-Việt reading (10,540+ characters)
   * 4. Character-by-character breakdown (Chiết tự)
   * 5. Fallback to local lexicon if offline
   */
  public async lookupExact(word: string): Promise<DictionaryEntry | null> {
    if (!word || word.trim() === '') return null;
    const cleanWord = word.trim();

    // Must contain at least one Chinese character
    if (!CHINESE_CHAR_REGEX.test(cleanWord)) {
      return null;
    }

    // Check in-memory cache
    if (this.entryCache.has(cleanWord)) {
      return this.entryCache.get(cleanWord)!;
    }

    // Deduplicate in-flight requests for the same word
    if (this.inFlightRequests.has(cleanWord)) {
      return this.inFlightRequests.get(cleanWord)!;
    }

    const lookupPromise = (async (): Promise<DictionaryEntry | null> => {
      // 1. Get Pinyin and Han-Viet
      const pinyin = this.getPinyin(cleanWord);
      const hanviet = this.getHanViet(cleanWord);

      // Traditional character if different
      let traditional: string | undefined;
      try {
        const trad = tify(cleanWord);
        if (trad && trad !== cleanWord) {
          traditional = trad;
        }
      } catch {
        // ignore
      }

      // 2. Fetch live translation
      const { translation, alternatives } = await this.translateDirect(cleanWord);

      // 3. Collect meanings
      const meanings: string[] = [];
      const localEntry = CHINESE_VIETNAMESE_LEXICON[cleanWord];

      // Curated definitions from local lexicon if available
      if (localEntry?.meanings) {
        meanings.push(...localEntry.meanings);
      }

      // Live translation
      if (translation && !meanings.some((m) => m.toLowerCase() === translation.toLowerCase())) {
        meanings.unshift(translation);
      }

      // Alternative meanings
      for (const alt of alternatives) {
        if (!meanings.some((m) => m.toLowerCase() === alt.toLowerCase())) {
          meanings.push(alt);
        }
      }

      // Fallback if offline and word not in local lexicon
      if (meanings.length === 0) {
        if (hanviet && hanviet !== cleanWord) {
          meanings.push(`Âm Hán Việt: ${hanviet}`);
        } else {
          meanings.push('Chưa tìm thấy nghĩa.');
        }
      }

      // 4. Build sub-entries for multi-character words (Chiết tự / Từng chữ)
      const chars = Array.from(cleanWord);
      const subEntries: DictionaryEntry[] = [];

      if (chars.length >= 2 && chars.length <= 6) {
        for (const c of chars) {
          if (CHINESE_CHAR_REGEX.test(c)) {
            const charPinyin = this.getPinyin(c);
            const charHanviet = this.getHanViet(c);
            const charLocal = CHINESE_VIETNAMESE_LEXICON[c];

            let charMeaning = charLocal?.meanings?.[0] || '';
            if (!charMeaning && charHanviet) {
              charMeaning = `Hán-Việt: ${charHanviet}`;
            }

            subEntries.push({
              simplified: c,
              pinyin: charPinyin,
              hanviet: charHanviet || undefined,
              meanings: charMeaning ? [charMeaning] : [],
            });
          }
        }
      }

      const resultEntry: DictionaryEntry = {
        simplified: cleanWord,
        traditional,
        pinyin,
        hanviet: hanviet || undefined,
        meanings: meanings.slice(0, 5),
        subEntries: subEntries.length > 0 ? subEntries : undefined,
        pos: localEntry?.pos,
        hsk: localEntry?.hsk,
      };

      // Cache the result
      if (this.entryCache.size >= this.maxCacheSize) {
        const firstKey = this.entryCache.keys().next().value;
        if (firstKey) this.entryCache.delete(firstKey);
      }
      this.entryCache.set(cleanWord, resultEntry);

      return resultEntry;
    })();

    this.inFlightRequests.set(cleanWord, lookupPromise);

    try {
      const finalResult = await lookupPromise;
      return finalResult;
    } finally {
      this.inFlightRequests.delete(cleanWord);
    }
  }

  /**
   * Core Zhongwen algorithm: Find the most relevant Chinese word at a specific character index
   * Uses Intl.Segmenter word boundaries + Compound word prioritization + Direct translation engine
   */
  public async lookupWordAt(fullText: string, charIndex: number): Promise<LookupResult | null> {
    if (!fullText || charIndex < 0 || charIndex >= fullText.length) {
      return null;
    }

    const targetChar = fullText[charIndex];
    if (!CHINESE_CHAR_REGEX.test(targetChar)) {
      return null;
    }

    // 1. Initial word candidate using Intl.Segmenter
    let targetWord = targetChar;
    let startIndex = charIndex;
    let endIndex = charIndex + 1;

    if (this.segmenter) {
      const segments = Array.from(this.segmenter.segment(fullText));
      const matchedSeg = segments.find(
        (s) => s.index <= charIndex && charIndex < s.index + s.segment.length
      );
      if (matchedSeg && matchedSeg.segment.trim().length > 0) {
        targetWord = matchedSeg.segment.trim();
        startIndex = matchedSeg.index;
        endIndex = startIndex + matchedSeg.segment.length;
      }
    }

    // 2. Prioritize longer compound words from lexicon if one spans over charIndex
    // e.g. "人工智能", "中华人民共和国", "登机牌"
    for (let len = 7; len > targetWord.length; len--) {
      const minStart = Math.max(0, charIndex - len + 1);
      const maxStart = Math.min(charIndex, fullText.length - len);

      for (let start = minStart; start <= maxStart; start++) {
        const candidate = fullText.substring(start, start + len);
        if (CHINESE_VIETNAMESE_LEXICON[candidate]) {
          targetWord = candidate;
          startIndex = start;
          endIndex = start + len;
          break;
        }
      }
      if (targetWord.length === len) break;
    }

    // 3. Lookup the candidate word using full translation engine
    const entry = await this.lookupExact(targetWord);
    if (!entry) return null;

    return {
      word: targetWord,
      entry,
      startIndex,
      endIndex,
    };
  }
}

export const dictionaryService = new DictionaryService();
