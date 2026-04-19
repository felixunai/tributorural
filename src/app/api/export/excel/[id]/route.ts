import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"

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

  // Load the reference calculation to determine the group
  const ref = await prisma.calculation.findUnique({
    where: { id },
    select: { type: true, productId: true, title: true, userId: true },
  })

  if (!ref || ref.userId !== session.user.id) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  }

  // Group: same type + productId (RURAL_TAX) or same type + title (CLT/RESCISAO)
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

  const rows = calculations.map((c) => {
    if (c.type === "RURAL_TAX") {
      return {
        Data: new Intl.DateTimeFormat("pt-BR").format(c.createdAt),
        Título: c.title ?? "",
        Produto: c.product?.name ?? "",
        NCM: c.product?.ncmCode ?? "",
        "Estado Origem": c.originState ?? "",
        "Estado Destino": c.destState ?? "",
        "Valor Venda (R$)": Number(c.saleValue ?? 0),
        "ICMS (R$)": Number(c.icmsAmount ?? 0),
        "PIS (R$)": Number(c.pisAmount ?? 0),
        "COFINS (R$)": Number(c.cofinsAmount ?? 0),
        "FUNRURAL (R$)": Number(c.funruralAmount ?? 0),
        "Total Impostos (R$)": Number(c.totalTaxAmount ?? 0),
        "Alíquota Efetiva (%)": Number(c.effectiveRate ?? 0),
      }
    }
    if (c.type === "RH_CLT") {
      return {
        Data: new Intl.DateTimeFormat("pt-BR").format(c.createdAt),
        Título: c.title ?? "",
        "Salário Bruto (R$)": Number(c.grossSalary ?? 0),
        "INSS Patronal (R$)": Number(c.inssPatronal ?? 0),
        "FGTS (R$)": Number(c.fgts ?? 0),
        "13° Salário (R$)": Number(c.decimoTerceiro ?? 0),
        "Férias + 1/3 (R$)": Number(c.ferias ?? 0),
        "RAT/FAP (R$)": Number(c.ratFap ?? 0),
        "Sistema S (R$)": Number(c.sistemaS ?? 0),
        "Custo Total (R$)": Number(c.totalCost ?? 0),
      }
    }
    // RESCISAO
    return {
      Data: new Intl.DateTimeFormat("pt-BR").format(c.createdAt),
      Título: c.title ?? "",
      "Tipo Rescisão": c.tipoRescisao ?? "",
      "Admissão": c.admissionDate ? new Intl.DateTimeFormat("pt-BR").format(c.admissionDate) : "",
      "Rescisão": c.terminationDate ? new Intl.DateTimeFormat("pt-BR").format(c.terminationDate) : "",
      "Salário Bruto (R$)": Number(c.grossSalary ?? 0),
      "Total Bruto (R$)": Number(c.totalCost ?? 0),
    }
  })

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()

  const sheetName =
    ref.type === "RURAL_TAX" ? "Impostos Rurais"
    : ref.type === "RH_CLT" ? "Custo CLT"
    : "Rescisão CLT"

  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  const label = (ref.type === "RURAL_TAX"
    ? calculations[0]?.product?.name
    : calculations[0]?.title) ?? "calculo"

  const filename = `tributo-rural-${label.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.xlsx`

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
