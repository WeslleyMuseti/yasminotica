import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function test() {
  const source = path.resolve('public/YASMIN ÓTICA.Sheets.xlsx');

  console.log('Lendo planilha...');
  const start = Date.now();
  const wb = XLSX.readFile(source);
  console.log(`Lida em ${Date.now() - start}ms.`);

  wb.SheetNames.forEach(name => {
    const ws = wb.Sheets[name];
    const ref = ws['!ref'] || 'A1:A1';
    const range = XLSX.utils.decode_range(ref);
    const totalRows = range.e.r - range.s.r + 1;
    
    // Converter para json para ver quantas linhas têm dados reais
    const rows = XLSX.utils.sheet_to_json(ws);
    console.log(`Aba: ${name.padEnd(30)} | Range: ${ref.padEnd(15)} | Linhas Totais: ${String(totalRows).padStart(6)} | Linhas com Dados: ${String(rows.length).padStart(6)}`);
  });
}

test().catch(console.error);
