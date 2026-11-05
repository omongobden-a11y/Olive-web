const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function buildAnthemPdf(outPath) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const writeStream = fs.createWriteStream(outPath);
  doc.pipe(writeStream);

  // Decorative page border
  doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
     .lineWidth(2)
     .strokeColor('#8b1e2b')
     .stroke();

  doc.rect(24, 24, doc.page.width - 48, doc.page.height - 48)
     .lineWidth(0.75)
     .strokeColor('#d49a16')
     .stroke();

  // Header Crest / Title
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold')
     .fontSize(20)
     .fillColor('#8b1e2b')
     .text('OLIVE NURSERY AND PRIMARY SCHOOL - ATAPARA', { align: 'center' });

  doc.moveDown(0.2);
  doc.font('Helvetica-Bold')
     .fontSize(11)
     .fillColor('#d49a16')
     .text('MOTTO: TOIL TO GAIN', { align: 'center' });

  doc.font('Helvetica')
     .fontSize(9)
     .fillColor('#444444')
     .text('Licence: ME/P/10412  |  EMIS: 800048  |  Awaimunga Village, Kamdini, Oyam District, Uganda', { align: 'center' });

  doc.moveDown(0.4);
  doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
  doc.moveDown(0.6);

  doc.font('Helvetica-Bold')
     .fontSize(15)
     .fillColor('#8b1e2b')
     .text('OFFICIAL SCHOOL ANTHEM', { align: 'center' });

  doc.moveDown(0.8);

  // Stanza 1
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#8b1e2b').text('STANZA 1', { align: 'center' });
  doc.font('Helvetica').fontSize(11.5).fillColor('#111827').text(
    'Olive\nThe school for our future\nThe school of peace, love, and joy\nOur motto is toil to gain\nThat\'s why we shall always struggle',
    { align: 'center', lineGap: 3 }
  );
  doc.moveDown(0.6);

  // Stanza 2
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#8b1e2b').text('STANZA 2', { align: 'center' });
  doc.font('Helvetica').fontSize(11.5).fillColor('#111827').text(
    'Our parents support our director\nOur teachers, PTA\nBecause divided we shall fall\nAnd together we shall always struggle',
    { align: 'center', lineGap: 3 }
  );
  doc.moveDown(0.6);

  // Stanza 3
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#8b1e2b').text('STANZA 3', { align: 'center' });
  doc.font('Helvetica').fontSize(11.5).fillColor('#111827').text(
    'From the rising, rising of the sun\nTo its setting, grace is above\nWe are always one\nTogether as one',
    { align: 'center', lineGap: 3 }
  );
  doc.moveDown(0.6);

  // Stanza 4
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#8b1e2b').text('STANZA 4', { align: 'center' });
  doc.font('Helvetica').fontSize(11.5).fillColor('#111827').text(
    'Discipline is our nature\nOur results is out of hard work\nWe are after quality\nBut not quantity',
    { align: 'center', lineGap: 3 }
  );
  doc.moveDown(0.6);

  // Stanza 5
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#8b1e2b').text('STANZA 5', { align: 'center' });
  doc.font('Helvetica').fontSize(11.5).fillColor('#111827').text(
    'Olive\nThe school for our future\nThe school of peace, love, and joy\nOur motto is toil to gain\nThat\'s why we shall always struggle\n\nAlways struggle',
    { align: 'center', lineGap: 3 }
  );
  doc.moveDown(0.8);

  // Footer notes & Contacts
  doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold')
     .fontSize(8.5)
     .fillColor('#8b1e2b')
     .text('Official Inquiries: Principal Director: 0782053937 | Head Teacher: 0774496507 | Bursar: 0773782383', { align: 'center' });
  doc.font('Helvetica')
     .fontSize(8)
     .fillColor('#6b7280')
     .text('Bank: Opportunity Bank, Kamdini branch - A/C 120396591117 (Olive Nursery and Primary School - Atapara)', { align: 'center' });

  doc.end();
  return new Promise((resolve) => writeStream.on('finish', resolve));
}

(async function() {
  const rootPath = path.join(__dirname, '..', 'Olive_School_Anthem.pdf');
  const pubPath = path.join(__dirname, '..', 'public', 'Olive_School_Anthem.pdf');
  await buildAnthemPdf(rootPath);
  await buildAnthemPdf(pubPath);
  console.log('Anthem PDF generated successfully in root and public directories!');
})();
