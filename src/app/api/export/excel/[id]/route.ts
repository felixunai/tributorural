import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
const DATE = new Intl.DateTimeFormat("pt-BR")
const PCT = (v: number) => `${(v * 100).toFixed(2).replace(".", ",")}%`

type Row = (string | number | null)[]

// ─── RESCISÃO ─────────────────────────────────────────────────────────────────
function buildRescisaoRows(c: Record<string, unknown>, index: number, total: number): Row[] {
  const snap = c.ratesSnapshot as Record<string, unknown> | null
  const res = snap?.result as Record<string, unknown> | undefined

  const tipo = (c.tipoRescisao as string) ?? snap?.tipoRescisao ?? ""
  const tipoLabel: Record<string, string> = {
    SEM_JUSTA_CAUSA: "Dispensa sem justa causa",
    COM_JUSTA_CAUSA: "Dispensa com justa causa",
    PEDIDO_DEMISSAO: "Pedido de demissão",
    ACORDO_MUTUO: "Acordo mútuo",
  }
  const admission = c.admissionDate
    ? DATE.format(new Date(c.admissionDate as string))
    : (snap?.admissionDate as string) ?? ""
  const termination = c.terminationDate
    ? DATE.format(new Date(c.terminationDate as string))
    : (snap?.terminationDate as string) ?? ""

  const grossSalary = Number(c.grossSalary ?? 0)
  const totalBruto = res ? Number(res.totalBruto ?? 0) : Number(c.totalCost ?? 0)
  const totalDescontos = res ? Number(res.totalDescontos ?? 0) : 0
  const totalLiquido = res ? Number(res.totalLiquido ?? 0) : totalBruto - totalDescontos
  const fgtsAcumulado = res ? Number(res.fgtsAcumulado ?? 0) : 0
  const fgtsRescisao = res ? Number(res.fgtsRescisao ?? 0) : 0
  const multaFgts = res ? Number(res.multaFgts ?? 0) : 0
  const fgtsTotal = res ? Number(res.fgtsTotal ?? 0) : 0
  const anosCompletos = res ? Number(res.anosCompletos ?? 0) : 0
  const diasAviso = res ? Number(res.diasAvisoPrevio ?? 0) : 0

  const rows: Row[] = []

  if (total > 1) rows.push([`── Cálculo ${index + 1} de ${total} ──`, null, null])

  rows.push(["RESCISÃO CLT", null, null])
  rows.push(["Funcionário / Título", c.title as string ?? "", null])
  rows.push(["Tipo de rescisão", tipoLabel[tipo] ?? tipo, null])
  rows.push(["Data de admissão", admission, null])
  rows.push(["Data de rescisão", termination, null])
  rows.push(["Anos de serviço", anosCompletos, null])
  rows.push(["Aviso prévio", `${diasAviso} dias`, null])
  rows.push(["Salário base", grossSalary, null])
  rows.push([null, null, null])

  rows.push(["VERBAS RESCISÓRIAS", null, null])
  rows.push(["Item", "Descrição", "Valor (R$)"])

  const items = (res?.items as Array<{ label: string; description: string; amount: number; kind: string }>) ?? []
  for (const item of items.filter((i) => i.kind === "earning")) {
    rows.push([item.label, item.description, Math.abs(item.amount)])
  }
  rows.push(["Total bruto", null, totalBruto])
  rows.push([null, null, null])

  rows.push(["DESCONTOS DO FUNCIONÁRIO", null, null])
  rows.push(["Item", "Descrição", "Valor (R$)"])
  for (const item of items.filter((i) => i.kind === "deduction")) {
    rows.push([item.label, item.description, Math.abs(item.amount)])
  }
  rows.push(["Total descontos", null, totalDescontos])
  rows.push([null, null, null])

  rows.push(["RESUMO", null, null])
  rows.push(["Total bruto das verbas", null, totalBruto])
  rows.push(["(–) Descontos", null, totalDescontos])
  rows.push(["Líquido a pagar ao funcionário", null, totalLiquido])
  rows.push([null, null, null])

  rows.push(["FGTS — depósito separado (não reduz o líquido)", null, null])
  rows.push(["Saldo acumulado no contrato", null, fgtsAcumulado])
  rows.push(["FGTS sobre rescisão (8%)", null, fgtsRescisao])
  rows.push(["Multa FGTS", null, multaFgts])
  rows.push(["Total FGTS sacável", null, fgtsTotal])
  rows.push([null, null, null])

  return rows
}

// ─── RH CLT ───────────────────────────────────────────────────────────────────
function buildRhCltRows(c: Record<string, unknown>, index: number, total: number): Row[] {
  const snap = c.ratesSnapshot as Record<string, unknown> | null
  const res = snap?.result as Record<string, unknown> | undefined

  const grossSalary = Number(c.grossSalary ?? 0)
  const inssPatronal = Number(c.inssPatronal ?? 0)
  const fgts = Number(c.fgts ?? 0)
  const decimoTerceiro = Number(c.decimoTerceiro ?? 0)
  const ferias = Number(c.ferias ?? 0)
  const ratFap = Number(c.ratFap ?? 0)
  const sistemaS = Number(c.sistemaS ?? 0)
  const totalCost = Number(c.totalCost ?? 0)
  const ratFapPercent = Number(c.ratFapPercent ?? 0)

  const inssEmpregado = res ? Number(res.inssEmpregado ?? 0) : 0
  const irrfEmpregado = res ? Number(res.irrfEmpregado ?? 0) : 0
  const salarioLiquido = res ? Number(res.salarioLiquido ?? 0) : grossSalary - inssEmpregado - irrfEmpregado
  const totalEncargos = res ? Number(res.totalEncargos ?? 0) : totalCost - grossSalary

  const rows: Row[] = []

  if (total > 1) rows.push([`── Cálculo ${index + 1} de ${total} ──`, null, null])

  rows.push(["CUSTO CLT", null, null])
  rows.push(["Funcionário / Título", c.title as string ?? "", null])
  rows.push(["Data", DATE.format(new Date(c.createdAt as string)), null])
  rows.push(["Salário bruto", grossSalary, null])
  rows.push(["RAT/FAP aplicado", PCT(ratFapPercent), null])
  rows.push([null, null, null])

  rows.push(["ENCARGOS PATRONAIS", null, null])
  rows.push(["Item", "Alíquota", "Valor (R$)"])
  rows.push(["INSS Patronal", "20,00%", inssPatronal])
  rows.push(["FGTS", "8,00%", fgts])
  rows.push(["13° Salário (provisão mensal)", "8,33%", decimoTerceiro])
  rows.push(["Férias + 1/3 (provisão mensal)", "11,11%", ferias])
  rows.push([`RAT/FAP`, PCT(ratFapPercent), ratFap])
  rows.push(["Sistema S", "3,30%", sistemaS])
  rows.push(["Total encargos", null, totalEncargos])
  rows.push([null, null, null])

  rows.push(["CUSTO TOTAL MENSAL PARA A EMPRESA", null, null])
  rows.push(["Salário bruto", null, grossSalary])
  rows.push(["(+) Total encargos patronais", null, totalEncargos])
  rows.push(["Custo total", null, totalCost])
  rows.push([null, null, null])

  rows.push(["PERSPECTIVA DO FUNCIONÁRIO", null, null])
  rows.push(["Salário bruto", null, grossSalary])
  rows.push(["(–) INSS empregado", null, inssEmpregado])
  rows.push(["(–) IRRF", null, irrfEmpregado])
  rows.push(["Salário líquido", null, salarioLiquido])
  rows.push([null, null, null])

  return rows
}

// ─── RURAL TAX ────────────────────────────────────────────────────────────────
function buildRuralRows(
  c: Record<string, unknown> & { product?: { name: string; ncmCode: string } | null },
  index: number,
  total: number
): Row[] {
  const snap = c.ratesSnapshot as Record<string, unknown> | null
  const res = snap?.result as Record<string, unknown> | undefined

  const saleValue = Number(c.saleValue ?? 0)
  const icmsAmount = Number(c.icmsAmount ?? 0)
  const pisAmount = Number(c.pisAmount ?? 0)
  const cofinsAmount = Number(c.cofinsAmount ?? 0)
  const funruralAmount = Number(c.funruralAmount ?? 0)
  const totalTaxAmount = Number(c.totalTaxAmount ?? 0)
  const effectiveRate = Number(c.effectiveRate ?? 0)

  const icmsRate = res ? PCT(Number(res.icmsRate ?? 0)) : ""
  const pisRate = res ? PCT(Number(res.pisRate ?? 0)) : ""
  const cofinsRate = res ? PCT(Number(res.cofinsRate ?? 0)) : ""
  const funruralRate = res ? PCT(Number(res.funruralRate ?? 0)) : ""

  const rows: Row[] = []

  if (total > 1) rows.push([`── Cálculo ${index + 1} de ${total} ──`, null, null])

  rows.push(["IMPOSTOS RURAIS", null, null])
  rows.push(["Título", c.title as string ?? "", null])
  rows.push(["Data", DATE.format(new Date(c.createdAt as string)), null])
  rows.push(["Produto", c.product?.name ?? "", null])
  rows.push(["NCM", c.product?.ncmCode ?? "", null])
  rows.push(["Estado de origem", c.originState as string ?? "", null])
  rows.push(["Estado de destino", c.destState as string ?? "", null])
  rows.push(["Valor da venda", saleValue, null])
  rows.push([null, null, null])

  rows.push(["COMPOSIÇÃO TRIBUTÁRIA", null, null])
  rows.push(["Imposto", "Alíquota", "Valor (R$)"])
  rows.push(["ICMS interestadual", icmsRate, icmsAmount])
  rows.push(["PIS", pisRate, pisAmount])
  rows.push(["COFINS", cofinsRate, cofinsAmount])
  rows.push(["FUNRURAL", funruralRate, funruralAmount])
  rows.push(["Total de impostos", null, totalTaxAmount])
  rows.push(["Alíquota efetiva", PCT(effectiveRate), null])
  rows.push([null, null, null])

  rows.push(["RESULTADO LÍQUIDO", null, null])
  rows.push(["Valor de venda", null, saleValue])
  rows.push(["(–) Total impostos", null, totalTaxAmount])
  rows.push(["Valor líquido estimado", null, saleValue - totalTaxAmount])
  rows.push([null, null, null])

  return rows
}

// ─── FORMAT ───────────────────────────────────────────────────────────────────
function applyColumnWidths(ws: XLSX.WorkSheet) {
  ws["!cols"] = [{ wch: 42 }, { wch: 30 }, { wch: 18 }]
}

function formatCurrencyCells(ws: XLSX.WorkSheet, rows: Row[]) {
  rows.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (typeof cell === "number") {
        const addr = XLSX.utils.encode_cell({ r, c })
        if (ws[addr]) {
          ws[addr].z = '#,##0.00'
          ws[addr].t = 'n'
        }
      }
    })
  })
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!["PRO", "ENTERPRISE"].includes(session.user.planTier)) {
    return NextResponse.json({ error: "Plano PRO necessário" }, { status: 403 })
  }

  const { id } = await params

  const ref = await prisma.calculation.findUnique({
    where: { id },
    select: { type: true, productId: true, title: true, userId: true },
  })

  if (!ref || ref.userId !== session.user.id) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  }

  const groupFilter =
    ref.type === "RURAL_TAX" && ref.productId
      ? { type: ref.type, productId: ref.productId }
      : ref.title
      ? { type: ref.type, title: ref.title }
      : { id }

  const calculations = await prisma.calculation.findMany({
    where: { userId: session.user.id, ...groupFilter },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { name: true, ncmCode: true } } },
  })

  const wb = XLSX.utils.book_new()

  // One sheet per calculation when multiple; single sheet otherwise
  const useMultiSheet = calculations.length > 1

  if (useMultiSheet) {
    calculations.forEach((c, i) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const calc = c as any
      let rows: Row[]
      if (c.type === "RESCISAO") rows = buildRescisaoRows(calc, 0, 1)
      else if (c.type === "RH_CLT") rows = buildRhCltRows(calc, 0, 1)
      else rows = buildRuralRows(calc, 0, 1)

      const ws = XLSX.utils.aoa_to_sheet(rows)
      applyColumnWidths(ws)
      formatCurrencyCells(ws, rows)
      const label = DATE.format(new Date(c.createdAt)).replace(/\//g, "-")
      XLSX.utils.book_append_sheet(wb, ws, `${i + 1} - ${label}`)
    })
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calc = calculations[0] as any
    let rows: Row[]
    if (ref.type === "RESCISAO") rows = buildRescisaoRows(calc, 0, 1)
    else if (ref.type === "RH_CLT") rows = buildRhCltRows(calc, 0, 1)
    else rows = buildRuralRows(calc, 0, 1)

    const ws = XLSX.utils.aoa_to_sheet(rows)
    applyColumnWidths(ws)
    formatCurrencyCells(ws, rows)
    const sheetName = ref.type === "RESCISAO" ? "Rescisão CLT" : ref.type === "RH_CLT" ? "Custo CLT" : "Impostos Rurais"
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  const rawLabel = (ref.type === "RURAL_TAX"
    ? calculations[0]?.product?.name
    : calculations[0]?.title) ?? "calculo"

  const safeLabel = rawLabel
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")

  const filename = `tributo-rural-${safeLabel}-${new Date().toISOString().slice(0, 10)}.xlsx`

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
