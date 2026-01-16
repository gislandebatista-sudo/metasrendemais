import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, PieChartIcon, BarChart3, Activity, Building2 } from 'lucide-react';
import { Employee, calculateTotalPerformance, getGoalStatus } from '@/types/employee';

interface PerformanceChartsProps {
  employees: Employee[];
}

const COLORS = {
  primary: 'hsl(222, 60%, 20%)',
  accent: 'hsl(43, 96%, 56%)',
  low: 'hsl(0, 84%, 60%)',
  medium: 'hsl(45, 93%, 47%)',
  high: 'hsl(142, 71%, 45%)',
  excellent: 'hsl(142, 76%, 36%)',
};

export function PerformanceCharts({ employees }: PerformanceChartsProps) {
  const activeEmployees = employees.filter(emp => emp.status === 'active');
  
  // Calculate data for charts
  const employeePerformances = activeEmployees.map(emp => ({
    name: emp.name.split(' ').slice(0, 2).join(' '),
    fullName: emp.name,
    performance: calculateTotalPerformance(emp),
    sector: emp.sector,
    bonus: emp.performanceBonus,
  })).sort((a, b) => b.performance - a.performance);

  // Distribution data
  const distribution = {
    low: employeePerformances.filter(e => e.performance < 80).length,
    medium: employeePerformances.filter(e => e.performance >= 80 && e.performance < 100).length,
    high: employeePerformances.filter(e => e.performance >= 100 && e.performance < 105).length,
    excellent: employeePerformances.filter(e => e.performance >= 105).length,
  };

  const distributionData = [
    { name: 'Abaixo de 80%', value: distribution.low, color: COLORS.low },
    { name: '80% - 99%', value: distribution.medium, color: COLORS.medium },
    { name: '100% - 104%', value: distribution.high, color: COLORS.high },
    { name: '105%+', value: distribution.excellent, color: COLORS.excellent },
  ].filter(d => d.value > 0);

  // Goal status distribution
  const allGoals = activeEmployees.flatMap(emp => [...emp.macroGoals, ...emp.sectoralGoals]);
  const goalStatusData = [
    { name: 'Antes do Prazo', value: allGoals.filter(g => getGoalStatus(g.deadline, g.deliveryDate) === 'early').length, color: COLORS.excellent },
    { name: 'No Prazo', value: allGoals.filter(g => getGoalStatus(g.deadline, g.deliveryDate) === 'on_time').length, color: COLORS.high },
    { name: 'Com Atraso', value: allGoals.filter(g => getGoalStatus(g.deadline, g.deliveryDate) === 'late').length, color: COLORS.low },
    { name: 'Não Entregue', value: allGoals.filter(g => getGoalStatus(g.deadline, g.deliveryDate) === 'not_delivered').length, color: COLORS.medium },
  ].filter(d => d.value > 0);

  // Sector averages
  const sectorData = Object.entries(
    employeePerformances.reduce((acc, emp) => {
      if (!acc[emp.sector]) {
        acc[emp.sector] = { total: 0, count: 0 };
      }
      acc[emp.sector].total += emp.performance;
      acc[emp.sector].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>)
  ).map(([sector, data]) => ({
    sector,
    average: data.total / data.count,
    fill: data.total / data.count >= 100 ? COLORS.high : data.total / data.count >= 80 ? COLORS.medium : COLORS.low,
  })).sort((a, b) => b.average - a.average);

  // Monthly evolution mock data
  const monthlyEvolution = [
    { month: 'Set', equipe: 85, top3: 102 },
    { month: 'Out', equipe: 88, top3: 104 },
    { month: 'Nov', equipe: 91, top3: 103 },
    { month: 'Dez', equipe: 89, top3: 105 },
    { month: 'Jan', equipe: 93, top3: 104 },
  ];

  // Top performer vs max
  const topPerformers = employeePerformances.slice(0, 5).map(emp => ({
    name: emp.name,
    atual: emp.performance,
    meta: 105,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Ranking Bar Chart */}
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Top 6 - Desempenho Individual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={employeePerformances.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" domain={[0, 110]} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Desempenho']}
                  labelFormatter={(label) => employeePerformances.find(e => e.name === label)?.fullName || label}
                />
                <Bar 
                  dataKey="performance" 
                  radius={[0, 4, 4, 0]}
                  fill={COLORS.primary}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Performance Distribution Pie */}
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-primary" />
            Distribuição de Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} colaboradores`, 'Quantidade']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Goal Status Distribution */}
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Status de Entregas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={goalStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {goalStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} metas`, 'Quantidade']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Sector Averages */}
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Média por Setor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="sector" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                <YAxis domain={[0, 110]} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Média']} />
                <Bar 
                  dataKey="average" 
                  radius={[4, 4, 0, 0]}
                >
                  {sectorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Evolution */}
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Evolução Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyEvolution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[70, 110]} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(value: number) => [`${value}%`, '']} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="equipe" 
                  name="Média Equipe"
                  stroke={COLORS.primary} 
                  strokeWidth={2}
                  dot={{ fill: COLORS.primary }}
                />
                <Line 
                  type="monotone" 
                  dataKey="top3" 
                  name="Top 3"
                  stroke={COLORS.accent} 
                  strokeWidth={2}
                  dot={{ fill: COLORS.accent }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers vs Max */}
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Top 5 vs Meta Máxima (105%)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPerformers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" domain={[0, 110]} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, '']} />
                <Legend />
                <Bar dataKey="atual" name="Atual" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                <Bar dataKey="meta" name="Meta Máxima" fill={COLORS.accent} radius={[0, 4, 4, 0]} opacity={0.3} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
