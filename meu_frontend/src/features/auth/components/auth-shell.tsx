"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SlidersHorizontal, Workflow } from "lucide-react";
import { MeuMark } from "@/components/branding/meu-logo";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="auth-canvas">
      <div className="auth-artwork" aria-hidden="true" />
      <header className="auth-header">
        <Link href="/login" aria-label="Meu sign in" className="auth-brand">
          <MeuMark size={42} />
          <span>meu</span>
        </Link>
        <nav aria-label="Account" className="auth-nav">
          <Link href="/login" aria-current={pathname === "/login" ? "page" : undefined}>Log in</Link>
          <Link href="/signup" aria-current={pathname === "/signup" ? "page" : undefined}>Create account</Link>
        </nav>
      </header>
      <div className="auth-grid">
        <section className="auth-story" aria-labelledby="auth-story-title">
          <h2 id="auth-story-title" className="auth-headline">
            <span>Your markets.</span>
            <span>Your agents.</span>
            <span className="auth-headline-accent">Your control.</span>
          </h2>
          <p className="auth-intro">
            Configure trading agents, set capital and daily limits, and review every run in one workspace.
          </p>
          <div className="auth-information">
            <article className="auth-glass auth-info-card">
              <SlidersHorizontal aria-hidden="true" className="auth-info-icon" />
              <div>
                <h3>Rules before orders</h3>
                <p>Capital allocation, daily trade limits and position controls guide execution.</p>
              </div>
            </article>
            <article className="auth-glass auth-info-card auth-info-markets">
              <Workflow aria-hidden="true" className="auth-info-icon" />
              <div>
                <h3>A connected workspace</h3>
                <p>Connect Delta India, Binance or Zerodha.</p>
              </div>
            </article>
          </div>
        </section>
        <div className="auth-entry">
          <div className="auth-glass auth-form-panel">{children}</div>
          <p className="auth-entry-note">Connect your exchange after signing in.</p>
        </div>
      </div>
      <footer className="auth-footer">Your workspace. Your rules.</footer>
    </div>
  );
}
