import { notificationService } from "./notification.service";

const SERVICE_WORKER_PATH = "/sw.js";
const TOKEN_ID_KEY = "aionn_push_token_id";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export const webPushService = {
  isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  },

  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.isSupported()) return null;
    const registration = await navigator.serviceWorker.getRegistration(
      SERVICE_WORKER_PATH,
    );
    return registration?.pushManager.getSubscription() ?? null;
  },

  async enable(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error("Web push is not supported in this browser");
    }
    const { publicKey } = await notificationService.getPushPublicKey();
    if (!publicKey) {
      throw new Error("Web push is not configured on the server");
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Notification permission was denied");
    }

    const registration = await navigator.serviceWorker.register(
      SERVICE_WORKER_PATH,
    );
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });
    }

    const saved = await notificationService.registerDeviceToken(
      JSON.stringify(subscription.toJSON()),
      "web",
    );
    window.localStorage.setItem(TOKEN_ID_KEY, saved.tokenId);
  },

  async disable(): Promise<void> {
    if (!this.isSupported()) return;
    const registration = await navigator.serviceWorker.getRegistration(
      SERVICE_WORKER_PATH,
    );
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }

    const storedId = window.localStorage.getItem(TOKEN_ID_KEY);
    if (storedId) {
      try {
        await notificationService.removeDeviceToken(storedId);
      } catch {
        // The token may already be gone; the browser subscription is cancelled.
      }
      window.localStorage.removeItem(TOKEN_ID_KEY);
      return;
    }

    try {
      const tokens = await notificationService.listDeviceTokens();
      await Promise.all(
        tokens
          .filter((token) => token.os === "web")
          .map((token) => notificationService.removeDeviceToken(token.tokenId)),
      );
    } catch {
      // Nothing else to clean up.
    }
  },
};
