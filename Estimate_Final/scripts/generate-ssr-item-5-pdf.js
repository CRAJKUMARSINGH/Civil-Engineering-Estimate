import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3003';

async function uploadSSRFile() {
	// Optional: Upload an SSR file (server currently stubs this)
	const form = new FormData();
	const dummy = new Blob([new Uint8Array([0x50,0x4B])], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
	form.append('file', dummy, 'dummy-ssr.xlsx');
	const res = await fetch(`${BASE_URL}/api/ssr-files/upload`, { method: 'POST', body: form });
	if (!res.ok) throw new Error(`SSR upload failed: ${res.status}`);
	return res.json();
}

async function fetchSSRItems() {
	const res = await fetch(`${BASE_URL}/api/ssr-items`);
	if (!res.ok) throw new Error(`Fetch SSR items failed: ${res.status}`);
	return res.json();
}

function generatePDFForItem(item, outPath) {
	const dir = path.dirname(outPath);
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	const doc = new PDFDocument({ size: 'A4', margin: 50 });
	const stream = fs.createWriteStream(outPath);
	doc.pipe(stream);

	doc.fontSize(18).text('Standard Schedule of Rates - Item 5', { underline: true });
	doc.moveDown();
	doc.fontSize(12).text(`Code: ${item.code}`);
	doc.text(`Description: ${item.description}`);
	doc.text(`Unit: ${item.unit}`);
	doc.text(`Rate: ${item.rate}`);
	doc.text(`Category: ${item.category}`);

	doc.end();
	return new Promise((resolve) => stream.on('finish', resolve));
}

async function main() {
	console.log(`📤 Uploading SSR file (optional)...`);
	await uploadSSRFile().catch(() => {});

	console.log(`📥 Fetching SSR items...`);
	const items = await fetchSSRItems();
	if (!items || items.length < 5) throw new Error('Less than 5 SSR items available');
	const item5 = items[4];
	console.log(`📝 Item 5: ${item5.code} - ${item5.description}`);

	const outPath = path.resolve('logs/ssr-item-5.pdf');
	await generatePDFForItem(item5, outPath);
	console.log(`✅ PDF generated at: ${outPath}`);
}

main().catch(err => {
	console.error('Error:', err.message);
	process.exit(1);
});

