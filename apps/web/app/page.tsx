import { Hero } from "@/components/hero";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} ProdMatch.ai · Built for India · DPDP Act 2023 compliant</p>
      </footer>
    </main>
  );
}
