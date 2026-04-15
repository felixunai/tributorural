import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXTAUTH_URL ?? "https://tributorural.com.br";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/pricing", "/login", "/register"],
      disallow: ["/dashboard", "/calculadora-rural", "/calculadora-rh", "/historico", "/configuracoes", "/admin", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
