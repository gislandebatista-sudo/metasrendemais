/**
 * Configuração de marca/identidade da aplicação.
 * 
 * Ao clonar este projeto para outra empresa, edite APENAS este arquivo
 * para personalizar nome, slogan e ano exibido no cabeçalho.
 * 
 * Para trocar o logo, substitua o arquivo em src/assets/logo-rende-new.png
 * mantendo o mesmo nome (ou ajuste o import em src/components/dashboard/Header.tsx).
 * 
 * Para trocar cores, edite os tokens HSL em src/index.css e tailwind.config.ts.
 */
export const brand = {
  /** Nome curto exibido na tela de login e em títulos */
  name: "Rende +",
  /** Slogan/subtítulo na tela de login */
  tagline: "Sistema de Gestão de Performance",
  /** Título principal do cabeçalho do dashboard */
  dashboardTitle: "Gerenciamento de metas",
  /** Ano (ou texto livre) exibido abaixo do título do dashboard */
  dashboardYear: "2026",
} as const;
