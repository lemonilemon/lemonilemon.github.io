// Refuses to build the site with anything but the public build of the CV.
// The deploy workflow copies CV/public.pdf from the private resume repo to
// public/cv.pdf, and resume.tex stamps only that build with the PDF subject
// below, so the private build (phone number, email) can never go out.
import { existsSync, readFileSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { CV, LINKS } from '../src/consts.ts';

const STAMP = 'Public version';
const file = `public${CV.pdf}`;

if (!existsSync(file)) {
  console.log(`check-cv: no ${file}, so the CV page will say it is not up yet.`);
  process.exit(0);
}

const pdf = await getDocument({ data: new Uint8Array(readFileSync(file)) }).promise;
const { info } = (await pdf.getMetadata()) as { info: { Subject?: string } };
const problems: string[] = [];
if (info.Subject !== STAMP) problems.push(`its subject is not "${STAMP}", so it is not the public build`);
// Belt and braces: the contact details the public build swaps out.
for (let n = 1; n <= pdf.numPages; n++) {
  for (const annotation of await (await pdf.getPage(n)).getAnnotations()) {
    const url: string | undefined = annotation.unsafeUrl ?? annotation.url;
    if (url?.startsWith('tel:')) problems.push(`page ${n} links a phone number`);
    if (url?.startsWith('mailto:') && url !== LINKS.email) problems.push(`page ${n} links an email other than the site's`);
  }
}

if (problems.length > 0) {
  console.error(`check-cv: refusing to publish ${file}:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`check-cv: ${file} is the public build.`);
