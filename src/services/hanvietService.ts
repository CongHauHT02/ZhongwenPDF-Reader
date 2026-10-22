// @ts-ignore
import { tify } from 'chinese-conv';
// @ts-ignore
import { hanvietData } from 'hanviet-pinyin-words/src/hanvietData.js';
import { pinyin } from 'pinyin-pro';

/**
 * High-accuracy Sino-Vietnamese (Âm Hán Việt) converter
 * Supports 10,540+ Chinese characters covering both Simplified and Traditional forms.
 */
export function getHanViet(text: string): string {
  if (!text) return '';
  const clean = text.trim();
  const trad = tify(clean);
  const parts: string[] = [];

  for (let i = 0; i < trad.length; i++) {
    const c = trad[i];
    const orig = clean[i];

    // Look up in 10,540+ entries dictionary
    const entry = hanvietData[c] || hanvietData[orig];
    if (entry) {
      const firstKey = Object.keys(entry)[0];
      const reading = entry[firstKey]?.[0] || Object.values(entry).flat()[0];
      parts.push(reading);
    } else {
      parts.push(orig);
    }
  }

  return parts.join(' ');
}

/**
 * Get accurate Pinyin with standard tone marks for any Chinese text
 */
export function getPinyin(text: string): string {
  if (!text) return '';
  return pinyin(text);
}
