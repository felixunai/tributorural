"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/utils";
import type { RhBreakdownItem } from "@/lib/tax/rhClt";

interface RhCltBarChartProps {
  breakdown: RhBreakdownItem[];
}

export function RhCltBarChart({ breakdown }: RhCltBarChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Composição do custo</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={breakdown}
            layout="vertical"
            margin={{ left: 8, right: 16 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `R$ ${(v / 1000).toFixed(1)}k`}
            />
            <YAxis
              dataKey="label"
              type="category"
              width={140}
              tick={{ fontSize: 11 }}
            />
            <Tooltip formatter={(v: unknown) => [formatBRL(Number(v)), ""]} />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
              {breakdown.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
