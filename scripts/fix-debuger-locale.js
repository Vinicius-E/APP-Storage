// scripts/fix-debugger-locale.js
const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  '../node_modules/@react-native/debugger-frontend/dist/third-party/front_end/core/i18n/locales/pt.json'
);

const dir = path.dirname(filePath);

try {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '{}');
    console.log('✅ Arquivo pt.json criado para evitar erro do debugger.');
  } else {
    console.log('ℹ️ pt.json já existe, nenhum arquivo criado.');
  }
} catch (err) {
  console.error('Erro ao criar pt.json:', err);
}
