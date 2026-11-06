// Configuração do CTA.
export const CONFIG = {
  dominioLogin: 'cta.app',
  // Banco de dados do CTA no Supabase. A chave publicável é feita para ficar no site:
  // o que cada um pode ver é decidido pelas regras do banco, não por ela.
  supabase: {
    url: 'https://qjsfqhrqqrkngjgectyn.supabase.co',
    chave: 'sb_publishable_abvLMFKONs6CysNCKnjnJg_dgwFYPX1',
  },
  // O check-in só funciona dentro do CTA, na Lagoinha Alphaville (Av. Tamboré, 74, Barueri).
  // O raio cobre o terreno e a imprecisão do GPS do celular dentro do prédio.
  localCTA: { lat: -23.5046592, lng: -46.8448107, raioMetros: 200 },
};
