// Copia o painel e os arquivos comuns para dentro do programa desktop.
// O painel é o mesmo do navegador: uma correção lá vale aqui depois de rodar este script.
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..', 'public');
const destino = path.join(__dirname, 'app');

fs.rmSync(destino, { recursive: true, force: true });
fs.mkdirSync(destino, { recursive: true });
fs.cpSync(path.join(raiz, 'painel'), path.join(destino, 'painel'), { recursive: true });
fs.cpSync(path.join(raiz, 'assets'), path.join(destino, 'assets'), { recursive: true });
console.log('Painel copiado para desktop/app');
