import { PricingSection } from "@/components/landing/PricingSection";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Planos e Preços" };

export default function PricingPage() {
  return (
    <div className="py-16">
      <PricingSection />
    </div>
  );
}
