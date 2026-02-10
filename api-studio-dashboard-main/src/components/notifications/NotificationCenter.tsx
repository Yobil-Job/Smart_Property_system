import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { NotificationDto, PagedResult, NotificationType } from "@/lib/api/types";
import {
  Bell,
  Check,
  CheckCheck,
  Info,
  Wrench,
  AlertTriangle,
  RefreshCw,
  Clock,
  Inbox,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<PagedResult<NotificationDto>>({
    queryKey: ["notifications", unreadOnly],
    queryFn: () =>
      apiClient.get<PagedResult<NotificationDto>>("/notifications", {
        unreadOnly: unreadOnly ? "true" : undefined,
        pageSize: 50,
      }),
    refetchInterval: 30000, // Poll every 30 seconds for live updates
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["residentDashboard"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiClient.patch<{ markedCount: number }>("/notifications/read-all");
    },
    onSuccess: (res) => {
      toast.success("All notifications marked as read");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["residentDashboard"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to mark all as read");
    },
  });

  const notifications = data?.items ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getCategoryIcon = (type: NotificationType) => {
    switch (type) {
      case "StatusChange":
        return (
          <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <RefreshCw className="h-4 w-4" />
          </div>
        );
      case "Assignment":
        return (
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Wrench className="h-4 w-4" />
          </div>
        );
      case "Alert":
        return (
          <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Info className="h-4 w-4" />
          </div>
        );
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label="Open notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-primary text-[10px] font-extrabold text-primary-foreground flex items-center justify-center ring-2 ring-background animate-in zoom-in-50">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-5 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-base font-bold">Notifications</SheetTitle>
              {unreadCount > 0 && (
                <Badge variant="default" className="text-xs font-bold py-0 h-5">
                  {unreadCount} new
                </Badge>
              )}
            </div>

            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs font-semibold gap-1 text-primary hover:text-primary"
                disabled={markAllAsReadMutation.isPending}
                onClick={() => markAllAsReadMutation.mutate()}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all read</span>
              </Button>
            )}
          </div>
          <SheetDescription className="text-xs">
            Operational status changes, assignments, and building alerts.
          </SheetDescription>

          {/* Unread Filter Toggle */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant={!unreadOnly ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs font-medium"
              onClick={() => setUnreadOnly(false)}
            >
              All ({data?.totalCount ?? notifications.length})
            </Button>
            <Button
              variant={unreadOnly ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs font-medium"
              onClick={() => setUnreadOnly(true)}
            >
              Unread only ({unreadCount})
            </Button>
          </div>
        </SheetHeader>

        {/* Notification Scrollable Feed */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/60">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">Checking notification alerts...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-24 text-center px-6 space-y-2">
              <Inbox className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold text-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground">
                {unreadOnly
                  ? "You have caught up with all alerts!"
                  : "You do not have any notifications yet."}
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (!item.isRead) {
                    markAsReadMutation.mutate(item.id);
                  }
                }}
                className={`p-4 flex items-start gap-3.5 transition-colors cursor-pointer ${
                  !item.isRead
                    ? "bg-primary/5 hover:bg-primary/10"
                    : "bg-card/40 hover:bg-accent/40 opacity-80"
                }`}
              >
                {getCategoryIcon(item.notificationType)}

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h4
                      className={`text-xs font-semibold truncate ${
                        !item.isRead ? "text-foreground font-bold" : "text-muted-foreground"
                      }`}
                    >
                      {item.title}
                    </h4>
                    <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(item.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {item.message}
                  </p>
                </div>

                {!item.isRead && (
                  <span className="h-2 w-2 rounded-full bg-primary shrink-0 self-center" />
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

