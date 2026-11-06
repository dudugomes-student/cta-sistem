// Configuração do CTA.
export const CONFIG = {
  dominioLogin: 'cta.app',
  // Banco de dados do CTA no Supabase. A chave publicável é feita para ficar no site:
  // o que cada um pode ver é decidido pelas regras do banco, não por ela.
  supabase: {
    url: 'https://qjsfqhrqqrkngjgectyn.supabase.co',
    chave: 'sb_publishable_abvLMFKONs6CysNCKnjnJg_dgwFYPX1',
  },
  // Coordenadas do CTA para o check-in só funcionar lá dentro. Enquanto estiver vazio, o check-in funciona de qualquer lugar.
  localCTA: null, // { lat: -23.5, lng: -46.85, raioMetros: 150 }
};
