"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AdminChartsProps {
  calcsByDay: { date: string; count: number }[];
  pieData: { name: string; value: number }[];
}

const PIE_COLORS = ["#6366f1", "#3b82f6", "#10b981"];

export function AdminCharts({ calcsByDay, pieData }: AdminChartsProps) {
  const barData = calcsByDay.map((d) => ({
    date: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
    cálculos: d.count,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Cálculos — últimos 30 dias</CardTitle>
          <CardDescription>Total de cálculos realizados por dia na plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          {barData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Sem dados no período
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="cálculos" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distribuição de planos</CardTitle>
          <CardDescription>Assinaturas ativas por plano</CardDescription>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 || pieData.every((d) => d.value === 0) ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Sem assinaturas ativas
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend formatter={(v) => <span className="text-sm">{v}</span>} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
