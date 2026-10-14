"use client";

import { useEffect, useState } from "react";
import { LogOutIcon, FlaskConical, BookOpen, ChartCandlestick } from "lucide-react";
import {
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  Sidebar,
  SidebarContent,
} from "../ui/sidebar";
import { BellDotIcon } from "lucide-react";
import { MeuMark } from "@/components/branding/meu-logo";
import {
  AgentIcon,
  BellIcon,
  CandlesIcon,
  DashboardIcon,
  TuneIcon,
  VaultIcon,
} from "@/components/branding/meu-icons";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useUnreadNotifications } from "@/features/notifications/hooks/use-notifications";
import { useBrowserNotificationPermission } from "@/features/notifications/hooks/use-browser-notifications";
/** Terminal status readout — lives in the sidebar footer. */
function SidebarStatus() {
  const { data } = useUnreadNotifications();
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const unread = data?.count ?? 0;

  return (
    <div className="neu-inset space-y-3 p-4 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
      <div className="flex items-center gap-1.5">
        <span className="inline-block size-1.5 rounded-full bg-primary" />
        Workspace
      </div>
      <div className="flex items-center justify-between gap-2">
        <span>
          {unread > 0 ? (
            <span className="text-primary">{unread} unread</span>
          ) : (
            "0 unread"
          )}
        </span>
        <span className="tabular-nums">{time}</span>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: unreadData } = useUnreadNotifications();
  const { permission, request } = useBrowserNotificationPermission();
  const unreadCount = unreadData?.count ?? 0;
  const sidebarItems = [
    { label: "Dashboard", icon: DashboardIcon, url: "/dashboard" },
    { label: "Agents", icon: AgentIcon, url: "/agents" },
    { label: "Strategies", icon: FlaskConical, url: "/strategies" },
    { label: "Charts", icon: ChartCandlestick, url: "/charts" },
    { label: "Exchanges", icon: CandlesIcon, url: "/exchanges" },
    { label: "Credentials", icon: VaultIcon, url: "/credentials" },
    { label: "Notifications", icon: BellIcon, url: "/notifications" },
    { label: "Settings", icon: TuneIcon, url: "/settings" },
    { label: "Help", icon: BookOpen, url: "/help" },
  ];

  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      side="left"
      className="meu-sidebar"
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Meu home"
              className="h-auto items-center gap-3 py-2"
            >
              <Link href="/dashboard" aria-label="Meu home" prefetch>
                <MeuMark size={38} />
                <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:sr-only">
                  <span className="text-2xl font-semibold tracking-tight">
                    meu
                  </span>
                  <span className="truncate text-[10px] text-muted-foreground">
                    Trading workspace
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Your workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.label}
                    isActive={
                      pathname === item.url ||
                      pathname.startsWith(`${item.url}/`)
                    }
                    className="relative"
                  >
                    <Link href={item.url} prefetch>
                      <item.icon />
                      <span className="group-data-[collapsible=icon]:sr-only">{item.label}</span>
                      {item.label === "Notifications" && unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarStatus />
        <SidebarMenu>
          {permission === "default" && (
            <SidebarMenuItem>
              <SidebarMenuButton
                variant="outline"
                tooltip="Enable notifications"
                aria-label="Enable notifications"
                onClick={async () => {
                  const result = await request();
                  if (result === "denied") {
                    toast.error("Browser notifications were blocked");
                  }
                }}
              >
                <BellDotIcon />
                <span className="group-data-[collapsible=icon]:sr-only">Enable notifications</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              variant={"outline"}
              tooltip="Sign out"
              aria-label="Sign out"
              className="h-auto border-border/60"
              onClick={() =>
                authClient.signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      router.push("/login");
                    },
                    onError: (error) => {
                      toast.error(`Failed to sign out: ${error}`);
                    },
                  },
                })
              }
            >
              <LogOutIcon />
              <span className="group-data-[collapsible=icon]:sr-only">Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
