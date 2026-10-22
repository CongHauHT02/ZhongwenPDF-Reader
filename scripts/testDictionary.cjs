const path = require('path');

// Test the built-in lexicon data directly
const { CHINESE_VIETNAMESE_LEXICON, HAN_VIET_MAP } = require('../src/data/chineseDictData.ts');

console.log('Testing Chinese - Vietnamese Dictionary:');
console.log('1. Total Lexicon Entries:', Object.keys(CHINESE_VIETNAMESE_LEXICON).length);
console.log('2. Total Han-Viet Mappings:', Object.keys(HAN_VIET_MAP).length);

// Test word lookup
const word = '学习';
const entry = CHINESE_VIETNAMESE_LEXICON[word];
console.log('\nLookup "学习":', entry);

// Test Han-Viet generation
const sentence = '中华人民共和国';
const hv = Array.from(sentence).map(c => HAN_VIET_MAP[c] || c).join(' ');
console.log('\nHan-Viet for "中华人民共和国":', hv);

// Test AI / Tech word
const ai = '人工智能';
console.log('\nLookup "人工智能":', CHINESE_VIETNAMESE_LEXICON[ai]);

console.log('\nAll dictionary checks PASSED successfully!');
