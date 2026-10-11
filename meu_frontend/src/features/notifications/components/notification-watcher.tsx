"use client";

import { useEffect, useRef } from "react";
import {
  useNotificationUpdates,
  useUnreadNotifications,
} from "../hooks/use-notifications";
import { isBrowserNotificationsEnabled } from "../hooks/use-browser-notifications";

export function NotificationWatcher() {
  useNotificationUpdates();
  const { data } = useUnreadNotifications();
  const shownIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (!data) return;

    if (!initialized.current) {
      data.latest.forEach((n) => shownIds.current.add(n.id));
      initialized.current = true;
      return;
    }

    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "granted" ||
      !isBrowserNotificationsEnabled()
    ) {
      return;
    }

    data.latest.forEach((n) => {
      if (shownIds.current.has(n.id)) return;
      shownIds.current.add(n.id);

      const notification = new Notification(n.title, {
        body: n.message ?? undefined,
        tag: n.id,
        icon: "/img/meu-symbol.png",
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    });
  }, [data]);

  return null;
}
