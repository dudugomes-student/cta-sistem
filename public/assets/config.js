// Configuração do CTA.
// modoTeste: true deixa tudo funcionando com dados de teste no próprio navegador
// e pula a conferência de localização no check-in.
export const CONFIG = {
  modoTeste: true,
  dominioLogin: 'cta.app',
  // Coordenadas do CTA para o check-in. Preencher antes de desligar o modo de teste.
  localCTA: null, // { lat: -23.5, lng: -46.85, raioMetros: 150 }
  supabase: { url: '', chaveAnon: '' },
};
