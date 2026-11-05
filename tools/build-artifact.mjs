// Genera artifact.html (la versione pubblicata su claude.ai) a partire da index.html.
// Su claude.ai la pagina viene inserita in uno scheletro HTML già pronto: qui si tiene solo
// il contenuto, con titolo, meta e foglio di stile in cima.
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const body = html.match(/<body>([\s\S]*)<\/body>/)[1].trim();
const out = `<title>Menù settimanale</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="css/style.css">
${body}
`;
fs.writeFileSync(new URL('../artifact.html', import.meta.url), out);

// elenco dei file da pubblicare accanto alla pagina
const files = ['css/style.css'];
const walk = (dir) => {
  for (const e of fs.readdirSync(new URL(`../${dir}`, import.meta.url), { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(p);
    else if (/\.(m?js)$/.test(e.name)) files.push(p);
  }
};
walk('js');
fs.writeFileSync(new URL('../artifact-files.json', import.meta.url), JSON.stringify(files, null, 2) + '\n');
console.log(`artifact.html + ${files.length} file`);
