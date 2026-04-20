"use client"

import { useState } from "react"
import { ChevronsUpDown, Check } from "lucide-react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

interface Product {
  id: string
  name: string
  ncmCode: string
  category: string | null
}

interface ProductComboboxProps {
  products: Product[]
  value: string
  onChange: (value: string) => void
}

export function ProductCombobox({ products, value, onChange }: ProductComboboxProps) {
  const [open, setOpen] = useState(false)

  const grouped = products.reduce<Record<string, Product[]>>((acc, p) => {
    const cat = p.category ?? "Outros"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})

  const selected = products.find((p) => p.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        }
      >
        <span className={cn("flex-1 text-left truncate", !selected && "text-muted-foreground")}>
          {selected ? selected.name : "Selecione o produto..."}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="p-0"
        style={{ width: "var(--anchor-width)" }}
      >
        <Command>
          <CommandInput placeholder="Buscar produto..." autoFocus />
          <CommandList>
            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
            {Object.entries(grouped).map(([cat, prods]) => (
              <CommandGroup key={cat} heading={cat}>
                {prods.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={p.name}
                    onSelect={() => {
                      onChange(p.id)
                      setOpen(false)
                    }}
                  >
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-muted-foreground text-xs ml-2 shrink-0">NCM {p.ncmCode}</span>
                    {value === p.id && <Check className="ml-2 h-4 w-4 shrink-0 text-primary" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
