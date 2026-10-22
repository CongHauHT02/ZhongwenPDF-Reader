const { pinyin } = require('pinyin-pro');
const { tify } = require('chinese-conv');
const { hanvietData } = require('hanviet-pinyin-words/src/hanvietData.js');

function getHanViet(text) {
  if (!text) return '';
  const clean = text.trim();
  const trad = tify(clean);
  const parts = [];
  for (let i = 0; i < trad.length; i++) {
    const c = trad[i];
    const orig = clean[i];
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

async function translateDirect(text) {
  const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=vi&dt=t&dt=bd&dt=rm&dt=at&q=' + encodeURIComponent(text);
  const res = await fetch(url);
  const data = await res.json();
  const main = data[0]?.map(x => x[0]).filter(Boolean).join('') || '';
  const alts = (data[5] && data[5][0] && data[5][0][2]) ? data[5][0][2].map(x => x[0]).filter(Boolean) : [];
  return { main, alts };
}

const segmenter = new Intl.Segmenter('zh', { granularity: 'word' });

async function testHoverAt(fullText, charIndex) {
  const segments = Array.from(segmenter.segment(fullText));
  const matched = segments.find(s => s.index <= charIndex && charIndex < s.index + s.segment.length);
  const word = matched ? matched.segment : fullText[charIndex];
  const { main, alts } = await translateDirect(word);
  const py = pinyin(word);
  const hv = getHanViet(word);
  console.log(`Hover index ${charIndex} ('${fullText[charIndex]}') => Từ: "${word}" | Pinyin: ${py} | Hán-Việt: ${hv} | Nghĩa: ${[main, ...alts].slice(0, 3).join(', ')}`);
}

(async () => {
  const text = '请旅客们回到自己的座位上，并系好安全带。严禁抽烟。';
  console.log('--- Kiểm thử phân tích từ & tra cứu trực tiếp theo ngữ cảnh ---');
  console.log('Câu gốc:', text, '\n');
  await testHoverAt(text, 1);  // '旅' in '旅客'
  await testHoverAt(text, 9);  // '座' in '座位'
  await testHoverAt(text, 16); // '安' in '安全'
  await testHoverAt(text, 22); // '抽' in '抽烟'
  console.log('\n--- Kiểm thử câu dài / lựa chọn đoạn văn ---');
  const phrase = '请旅客们回到自己的座位上';
  const { main } = await translateDirect(phrase);
  console.log(`Đoạn văn: "${phrase}"\n-> Pinyin: ${pinyin(phrase)}\n-> Hán-Việt: ${getHanViet(phrase)}\n-> Dịch: ${main}`);
})();
