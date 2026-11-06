// Programa do painel do CTA para Windows.
// Abre o painel numa janela própria, sem barra de endereço.
// Os arquivos são servidos pelo endereço interno cta://painel, para os scripts
// e os dados salvos funcionarem do mesmo jeito que no navegador.
const { app, BrowserWindow, protocol, net, shell, Menu } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

protocol.registerSchemesAsPrivileged([
  { scheme: 'cta', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

const pasta = path.join(__dirname, 'app');

function abrirJanela() {
  const janela = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 380,
    minHeight: 560,
    title: 'CTA Painel',
    backgroundColor: '#1d1a19',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  janela.loadURL('cta://painel/painel/index.html');
  // links para fora (como o WhatsApp de um aluno) abrem no navegador
  janela.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  janela.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('cta://')) { e.preventDefault(); shell.openExternal(url); } });
}

const unicaInstancia = app.requestSingleInstanceLock();
if (!unicaInstancia) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [janela] = BrowserWindow.getAllWindows();
    if (janela) { if (janela.isMinimized()) janela.restore(); janela.focus(); }
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    protocol.handle('cta', (req) => {
      const { pathname } = new URL(req.url);
      const arquivo = path.normalize(path.join(pasta, decodeURIComponent(pathname)));
      if (!arquivo.startsWith(pasta)) return new Response('Não encontrado', { status: 404 });
      return net.fetch(pathToFileURL(arquivo).toString());
    });
    abrirJanela();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) abrirJanela(); });
  });

  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
