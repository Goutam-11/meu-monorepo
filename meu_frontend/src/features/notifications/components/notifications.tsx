"use client"
import { useState } from "react";
import {
  EntityContainer,
  EntityHeader,
  EntitySearch,
  EntityList,
  EntityItem,
  EntityAvatar,
  EntityBadge,
  EmptyView,
  EntityPagination,
} from "@/components/entityComponents";
import {
  AlertCircleIcon,
  InfoIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useRemoveNotifications, useNotifications, useMarkAllAsRead, useUnreadNotifications, useDeleteAllNotifications } from "../hooks/use-notifications";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function NotificationsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isFetching } = useNotifications({ page, search });
  const notifications = data?.notifications ?? [];
  const totalPages = data?.pagination.totalPages ?? 1;
  const removeNotif = useRemoveNotifications();
  const markAllRead = useMarkAllAsRead();
  const deleteAll = useDeleteAllNotifications();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { data: unreadData } = useUnreadNotifications();
  const router = useRouter();

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case "ERROR":
        return { icon: AlertCircleIcon, variant: "destructive" as const };
      case "WARNING":
        return { icon: AlertTriangleIcon, variant: "warning" as const };
      case "INFO":
        return { icon: InfoIcon, variant: "primary" as const };
      default:
        return { icon: InfoIcon, variant: "primary" as const };
    }
  };

  return (
    <EntityContainer
      loading={isFetching}
      header={
        <EntityHeader
          title="Notifications"
          description="Stay updated with your latest activities"
        />
      }
      search={
        <div className="flex flex-wrap items-center justify-between gap-4">
          <EntitySearch
            value={search}
            onChange={handleSearch}
            placeholder="Search notifications..."
          />
          <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={(unreadData?.count ?? 0) === 0 || markAllRead.isPending || deleteAll.isPending}
            onClick={() => markAllRead.mutate()}
          >
            Mark all as read
          </Button>
          <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!deleteAll.isPending) setDeleteDialogOpen(open); }}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={deleteAll.isPending || markAllRead.isPending || removeNotif.isPending}>
                Delete all
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all notifications?</AlertDialogTitle>
                <AlertDialogDescription>
                  Permanently delete every notification in your account, including unread items and those outside the current search or page. This cannot be undone. New alerts can still arrive. Execution records and trading history are kept; older failures that need notification evidence may require manual review.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteAll.isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className={buttonVariants({ variant: "destructive" })}
                  disabled={deleteAll.isPending}
                  onClick={(event) => {
                    event.preventDefault();
                    deleteAll.mutate(undefined, { onSuccess: () => { setPage(1); setSearch(""); setDeleteDialogOpen(false); } });
                  }}
                >
                  {deleteAll.isPending ? "Deleting…" : "Delete all notifications"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </div>
        </div>
      }
      pagination={
        <EntityPagination
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          disabled={isFetching}
        />
      }
    >
      <EntityList
        items={notifications}
        getKey={(notif) => notif.id}
        emptyView={
          <EmptyView
            title="No notifications"
            message="You're all caught up!"
          />
        }
        renderItem={(notif) => {
          const config = getTypeConfig(notif.type);
          const isRead = notif.status === "READ";
          return (
            <EntityItem
              title={notif.title}
              subtitle={notif.message}
              image={
                <EntityAvatar
                  icon={config.icon}
                  variant={config.variant}
                />
              }
              badge={!isRead && <EntityBadge variant="success">New</EntityBadge>}
              actions={
                <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                  {formatDistanceToNow(new Date(notif.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              }
              className={cn("flex flex-row items-center h-16 ",isRead ? "opacity-60" : "")}
              onRemove={deleteAll.isPending ? undefined : () => removeNotif.mutate({id:notif.id})}
              onClick={() => router.push(`/notifications/${notif.id}`)}
            />
          );
        }}
      />
    </EntityContainer>
  );
}
