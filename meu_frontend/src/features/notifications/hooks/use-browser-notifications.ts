import {
  useCallback,
  useSyncExternalStore,
} from "react";
import { reportClientError } from "@/lib/client-error-report";

const STORAGE_KEY = "meu:browser-notifications-enabled";

const permissionListeners = new Set<() => void>();
const enabledListeners = new Set<() => void>();
const emitPermissionChange = () =>
  permissionListeners.forEach((listener) => listener());
const emitEnabledChange = () =>
  enabledListeners.forEach((listener) => listener());

function subscribe(listener: () => void) {
  permissionListeners.add(listener);
  enabledListeners.add(listener);
  return () => {
    permissionListeners.delete(listener);
    enabledListeners.delete(listener);
  };
}

function getPermissionSnapshot(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

function getPermissionServerSnapshot(): NotificationPermission | "unsupported" {
  return "default";
}

export function isBrowserNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; ++i) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

async function registerPushSubscription() {
  if (!("serviceWorker" in navigator)) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    reportClientError("notification", "push_not_configured");
    return;
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = subscription.toJSON();
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(json),
  });
}

async function unregisterPushSubscription() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await fetch(
        `/api/push/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`,
        { method: "DELETE" }
      );
      await subscription.unsubscribe();
    }
  } catch {
    reportClientError("notification", "push_unsubscribe_failed");
  }
}

function getEnabledServerSnapshot(): boolean {
  return false;
}

export function useBrowserNotificationPermission() {
  const permission = useSyncExternalStore(
    subscribe,
    getPermissionSnapshot,
    getPermissionServerSnapshot
  );
  const enabled = useSyncExternalStore(
    subscribe,
    isBrowserNotificationsEnabled,
    getEnabledServerSnapshot
  );

  const request = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported" as const;
    }
    const result = await Notification.requestPermission();
    if (result === "granted") {
      window.localStorage.setItem(STORAGE_KEY, "true");
      new Notification("Notifications enabled", {
        body: "You will now receive alerts from Meu.",
        icon: "/img/meu-symbol.png",
      });
      emitEnabledChange();
      // Register web push so alerts arrive even with the browser closed
      try {
        await registerPushSubscription();
      } catch {
        reportClientError("notification", "subscription_failed");
      }
    }
    emitPermissionChange();
    return result;
  }, []);

  const disable = useCallback(() => {
    void unregisterPushSubscription();
    window.localStorage.removeItem(STORAGE_KEY);
    emitEnabledChange();
  }, []);

  return { permission, enabled, request, disable };
}
