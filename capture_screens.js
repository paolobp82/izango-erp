const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const outputDir = 'C:\\Users\\user\\.gemini\\antigravity\\brain\\388d2414-3f9d-4cf7-85dd-5fa1e59c69ea';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Iniciando navegador...');
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  console.log('Navegando al login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });

  console.log('Ingresando credenciales...');
  await page.type('input[type="email"]', 'admin@izango.pe');
  await page.type('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');

  console.log('Esperando redirección...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('Navegando a /dashboard (Ruta Oficial)...');
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2' });
  
  console.log('Esperando carga completa (5s)...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  await page.setViewport({ width: 1280, height: 800 });

  const filePath = path.join(outputDir, 'sidebar_v2.png');
  await page.screenshot({
    path: filePath,
    fullPage: false // Only viewport to show sidebar clearly
  });
  console.log(`[OK] Guardado: ${filePath}`);

  await browser.close();
  console.log('Captura de sidebar v2 completada.');
})();
