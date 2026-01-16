import { Employee } from '@/types/employee';

export const mockEmployees: Employee[] = [
  {
    id: '1',
    name: 'Ana Carolina Silva',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
    role: 'Gerente de Vendas',
    sector: 'Comercial',
    admissionDate: '2020-03-15',
    goals: [
      { id: 'g1', name: 'Meta de Vendas', description: 'Atingir faturamento mensal', weight: 40, achieved: 105 },
      { id: 'g2', name: 'Novos Clientes', description: 'Prospecção de novos clientes', weight: 30, achieved: 98 },
      { id: 'g3', name: 'Satisfação', description: 'NPS dos clientes', weight: 30, achieved: 102 },
    ],
  },
  {
    id: '2',
    name: 'Carlos Eduardo Santos',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    role: 'Analista Financeiro',
    sector: 'Financeiro',
    admissionDate: '2019-08-01',
    goals: [
      { id: 'g1', name: 'Fechamento Contábil', weight: 35, achieved: 100 },
      { id: 'g2', name: 'Redução de Custos', weight: 35, achieved: 95 },
      { id: 'g3', name: 'Relatórios', weight: 30, achieved: 100 },
    ],
  },
  {
    id: '3',
    name: 'Mariana Oliveira',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    role: 'Coordenadora de RH',
    sector: 'Recursos Humanos',
    admissionDate: '2021-01-10',
    goals: [
      { id: 'g1', name: 'Recrutamento', weight: 40, achieved: 88 },
      { id: 'g2', name: 'Treinamentos', weight: 30, achieved: 105 },
      { id: 'g3', name: 'Clima Organizacional', weight: 30, achieved: 92 },
    ],
  },
  {
    id: '4',
    name: 'Roberto Almeida',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    role: 'Desenvolvedor Senior',
    sector: 'Tecnologia',
    admissionDate: '2018-05-20',
    goals: [
      { id: 'g1', name: 'Entregas de Sprint', weight: 50, achieved: 100 },
      { id: 'g2', name: 'Code Review', weight: 25, achieved: 105 },
      { id: 'g3', name: 'Documentação', weight: 25, achieved: 90 },
    ],
  },
  {
    id: '5',
    name: 'Juliana Costa',
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    role: 'Gerente de Marketing',
    sector: 'Marketing',
    admissionDate: '2020-11-05',
    goals: [
      { id: 'g1', name: 'Leads Qualificados', weight: 40, achieved: 103 },
      { id: 'g2', name: 'Engajamento Social', weight: 30, achieved: 105 },
      { id: 'g3', name: 'Campanhas', weight: 30, achieved: 98 },
    ],
  },
  {
    id: '6',
    name: 'Fernando Souza',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    role: 'Analista de Operações',
    sector: 'Operações',
    admissionDate: '2022-02-14',
    goals: [
      { id: 'g1', name: 'Eficiência Operacional', weight: 35, achieved: 75 },
      { id: 'g2', name: 'SLA de Atendimento', weight: 35, achieved: 82 },
      { id: 'g3', name: 'Processos', weight: 30, achieved: 78 },
    ],
  },
  {
    id: '7',
    name: 'Patrícia Lima',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
    role: 'Diretora Comercial',
    sector: 'Comercial',
    admissionDate: '2017-06-01',
    goals: [
      { id: 'g1', name: 'Faturamento Geral', weight: 50, achieved: 102 },
      { id: 'g2', name: 'Expansão', weight: 30, achieved: 105 },
      { id: 'g3', name: 'Retenção', weight: 20, achieved: 100 },
    ],
  },
  {
    id: '8',
    name: 'Lucas Mendes',
    photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face',
    role: 'Analista de Qualidade',
    sector: 'Qualidade',
    admissionDate: '2021-09-01',
    goals: [
      { id: 'g1', name: 'Auditorias', weight: 40, achieved: 95 },
      { id: 'g2', name: 'NC Resolvidas', weight: 35, achieved: 88 },
      { id: 'g3', name: 'Documentação ISO', weight: 25, achieved: 100 },
    ],
  },
];

export const sectors = ['Comercial', 'Financeiro', 'Recursos Humanos', 'Tecnologia', 'Marketing', 'Operações', 'Qualidade'];
