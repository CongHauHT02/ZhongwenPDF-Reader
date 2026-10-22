const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');
const path = require('path');

async function create() {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const fontPath = 'C:/Windows/Fonts/simhei.ttf';
  const fontBytes = fs.readFileSync(fontPath);
  const customFont = await doc.embedFont(fontBytes, { subset: true });

  // Page 1
  const page1 = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page1.getSize();

  // Header Title
  page1.drawText('中文阅读与学习资料 (Tài liệu học tiếng Trung)', {
    x: 50,
    y: height - 80,
    size: 20,
    font: customFont,
    color: rgb(0.12, 0.18, 0.35),
  });

  page1.drawText('欢迎使用 Zhongwen PDF 阅读器。这是一个实用的中文学习与标注工具。', {
    x: 50,
    y: height - 120,
    size: 13,
    font: customFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  page1.drawText('学习汉语不仅能了解中国悠久的历史与灿烂的文化，', {
    x: 50,
    y: height - 155,
    size: 13,
    font: customFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  page1.drawText('更能帮助我们在国际交流与经济合作中取得成功。', {
    x: 50,
    y: height - 185,
    size: 13,
    font: customFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  page1.drawText('现在，人工智能科技正在快速发展，改变着人类的未来生活。', {
    x: 50,
    y: height - 215,
    size: 13,
    font: customFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  page1.drawText('只要每天坚持努力学习，遇到困难不放弃，就能不断提高水平，解决复杂的问题。', {
    x: 50,
    y: height - 245,
    size: 13,
    font: customFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  page1.drawText('健康与快乐是人生中非常宝贵的财富，朋友之间的真诚关怀同样重要。', {
    x: 50,
    y: height - 275,
    size: 13,
    font: customFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  page1.drawText('提示：将鼠标移动到上述词语（例如“学习”、“朋友”、“人工智能”）上方即可查看释义。', {
    x: 50,
    y: height - 330,
    size: 11,
    font: customFont,
    color: rgb(0.75, 0.35, 0.1),
  });

  page1.drawText('您也可以用鼠标选中任意词句，快速添加高亮颜色、标注拼音、越南语释义与个人笔记。', {
    x: 50,
    y: height - 355,
    size: 11,
    font: customFont,
    color: rgb(0.75, 0.35, 0.1),
  });

  // Page 2
  const page2 = doc.addPage([595.28, 841.89]);
  page2.drawText('第二页：科技与社会发展 (Trang 2: Khoa học công nghệ và xã hội)', {
    x: 50,
    y: height - 80,
    size: 18,
    font: customFont,
    color: rgb(0.12, 0.18, 0.35),
  });

  page2.drawText('计算机与互联网技术为现代社会带来了巨大的便利。', {
    x: 50,
    y: height - 120,
    size: 13,
    font: customFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  page2.drawText('通过阅读优秀的文章与研究报告，我们可以拓宽视野，总结经验，建立清晰的思维体系。', {
    x: 50,
    y: height - 150,
    size: 13,
    font: customFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  page2.drawText('良好的生活环境需要全社会的共同保护，绿水青山就是金山银山。', {
    x: 50,
    y: height - 180,
    size: 13,
    font: customFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  const publicDir = path.resolve(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const pdfBytes = await doc.save();
  const outputPath = path.join(publicDir, 'sample_chinese.pdf');
  fs.writeFileSync(outputPath, pdfBytes);
  console.log('Sample PDF successfully created at:', outputPath, 'Bytes:', pdfBytes.length);
}

create().catch(console.error);
