import { zipSync, strToU8 } from "fflate";
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("tests/fixtures", { recursive: true });
const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${ns}"><w:body><w:p><w:r><w:t>Osmosis: Movement of water across a selectively permeable membrane.</w:t></w:r></w:p><w:p><w:r><w:t>Cell: Basic unit of life.</w:t></w:r></w:p><w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr></w:body></w:document>`;
const contentTypes =
  '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
const rels =
  '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
writeFileSync(
  "tests/fixtures/science-notes.docx",
  zipSync({
    "[Content_Types].xml": strToU8(contentTypes),
    "_rels/.rels": strToU8(rels),
    "word/document.xml": strToU8(doc),
  }),
);
const content =
  "BT /F1 12 Tf 40 740 Td (Gravity: Attraction between masses.) Tj 0 -24 Td (Energy: Capacity to do work.) Tj ET";
const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
];
let pdf = "%PDF-1.4\n";
const offsets = [0];
objects.forEach((obj, i) => {
  offsets.push(Buffer.byteLength(pdf));
  pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
});
const xref = Buffer.byteLength(pdf);
pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
  .slice(1)
  .map((o) => `${String(o).padStart(10, "0")} 00000 n `)
  .join(
    "\n",
  )}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
writeFileSync("tests/fixtures/science-notes.pdf", pdf);
console.log("Created valid, minimal DOCX and text PDF import fixtures.");
