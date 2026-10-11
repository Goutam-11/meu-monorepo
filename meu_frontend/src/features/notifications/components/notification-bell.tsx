"use client";

import { useRouter } from "next/navigation";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  BellDotIcon,
  CheckCheckIcon,
  InfoIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useMarkAllAsRead,
  useUnreadNotifications,
} from "../hooks/use-notifications";
import Link from "next/link";

const typeIcons = {
  ERROR: AlertCircleIcon,
  WARNING: AlertTriangleIcon,
  INFO: InfoIcon,
} as const;

const typeColors = {
  ERROR: "text-destructive",
  WARNING: "text-warning",
  INFO: "text-primary",
} as const;

export function NotificationBell() {
  const { data } = useUnreadNotifications();
  const markAllRead = useMarkAllAsRead();
  const router = useRouter();
  const unread = data?.latest ?? [];
  const count = data?.count ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <BellDotIcon className="size-4" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {count > 9 ? "9+" : count}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            disabled={count === 0 || markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            <CheckCheckIcon className="size-3.5" />
            Mark all read
          </Button>
        </div>
        <ScrollArea className="max-h-80">
          {unread.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              You&apos;re all caught up!
            </p>
          ) : (
            <div className="divide-y">
              {unread.map((notif) => {
                const Icon = typeIcons[notif.type] ?? InfoIcon;
                return (
                  <button
                    key={notif.id}
                    className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent"
                    onClick={() => {
                      router.push(`/notifications/${notif.id}`);
                    }}
                  >
                    <Icon
                      className={`mt-0.5 size-4 shrink-0 ${
                        typeColors[notif.type] ?? "text-primary"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {notif.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {notif.message}
                      </span>
                      <span className="block text-[10px] text-muted-foreground/70">
                        {formatDistanceToNow(new Date(notif.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <div className="border-t p-1">
          <Link
            href="/notifications"
            className="block rounded-md px-3 py-2 text-center text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
