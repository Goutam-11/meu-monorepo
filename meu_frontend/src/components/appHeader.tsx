"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { SidebarTrigger } from "./ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { Button } from "@/components/ui/button";
import { useUISettings } from "@/components/ui-settings";

const TITLES: Record<string, string> = {
  dashboard: "Overview",
  agents: "Agents",
  charts: "Charts",
  exchanges: "Exchanges",
  credentials: "Credentials",
  notifications: "Notifications",
  settings: "Settings",
};

export function BreadcrumbSite({ segments }: { segments: string[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"
    >
      <Link href="/dashboard" className="hover:text-foreground">
        Workspace
      </Link>
      {segments.slice(0, 3).map((segment, index) => (
        <span key={index} className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true">/</span>
          <Link
            href={`/${segments.slice(0, index + 1).join("/")}`}
            className="truncate hover:text-foreground"
          >
            {TITLES[segment] ??
              (segment === "create"
                ? "Create"
                : segment === "edit"
                  ? "Edit"
                  : "Details")}
          </Link>
        </span>
      ))}
    </nav>
  );
}

export default function Header() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const { look, setLook } = useUISettings();
  const segments = pathname.split("/").filter(Boolean);
  const isLight = look === "sculpt-light";
  const name = session?.user.name ?? "Your account";
  return (
    <header className="relative z-10 flex min-h-20 shrink-0 items-center gap-4 px-5 py-4 md:px-8 lg:px-11">
      <SidebarTrigger className="neu-icon size-11" />
      <div className="min-w-0 flex-1">
        <BreadcrumbSite segments={segments} />
      </div>
      <div className="flex items-center gap-3 sm:gap-4">
        <Button
          variant="outline"
          size="icon"
          aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
          onClick={() => setLook(isLight ? "sculpt-dark" : "sculpt-light")}
        >
          {isLight ? <Moon /> : <Sun />}
        </Button>
        <NotificationBell />
        <Link
          href="/settings"
          aria-label={`Account settings for ${name}`}
          className="flex items-center gap-3 rounded-full focus-visible:outline-primary"
        >
          <span className="neu-icon size-11 text-sm font-medium text-primary">
            {name.slice(0, 1).toUpperCase()}
          </span>
          <span className="hidden max-w-40 truncate text-sm sm:block">
            {name}
          </span>
        </Link>
      </div>
    </header>
  );
}
