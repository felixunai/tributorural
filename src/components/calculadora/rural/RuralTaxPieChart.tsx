"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL, formatPercent } from "@/lib/utils";
import type { TaxBreakdownItem } from "@/lib/tax/ruralTax";

interface RuralTaxPieChartProps {
  breakdown: TaxBreakdownItem[];
  totalTax: number;
}

export function RuralTaxPieChart({ breakdown, totalTax }: RuralTaxPieChartProps) {
  const data = breakdown.map((item) => ({
    name: item.label,
    value: item.amount,
    color: item.color,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Composição tributária</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: unknown) => [
                formatBRL(Number(value)),
                `${formatPercent(Number(value) / totalTax)} do total`,
              ]}
            />
            <Legend
              formatter={(v) => <span className="text-xs">{v}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
