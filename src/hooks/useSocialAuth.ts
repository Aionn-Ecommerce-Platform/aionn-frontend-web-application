"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocaleStore } from "@/stores";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ?? "";

const GOOGLE_GSI_SRC = "https://accounts.google.com/gsi/client";
const FACEBOOK_SDK_SRC = "https://connect.facebook.net/en_US/sdk.js";

interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
}

interface GoogleButtonOptions {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number | string;
  locale?: string;
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (resp: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
    ux_mode?: "popup" | "redirect";
  }) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
  cancel: () => void;
  disableAutoSelect: () => void;
}

interface FacebookSdk {
  init: (opts: {
    appId: string;
    cookie?: boolean;
    xfbml?: boolean;
    version: string;
  }) => void;
  login: (
    cb: (response: {
      status: string;
      authResponse?: { accessToken: string; userID: string };
    }) => void,
    opts?: { scope?: string },
  ) => void;
  logout: (cb?: () => void) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
    FB?: FacebookSdk;
    fbAsyncInit?: () => void;
  }
}

const scriptPromises = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject("SSR");
  const existing = scriptPromises.get(src);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const found = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`,
    );
    if (found) {
      resolve();
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.defer = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(el);
  });
  scriptPromises.set(src, promise);
  return promise;
}

interface UseSocialAuthResult {
  googleConfigured: boolean;
  facebookConfigured: boolean;

  mountGoogleButton: (
    container: HTMLElement,
    onToken: (idToken: string) => void,
    options?: GoogleButtonOptions,
  ) => void;
  googleReady: boolean;

  signInWithFacebook: () => Promise<string | null>;
}

export function useSocialAuth(): UseSocialAuthResult {
  const [googleReadyLocale, setGoogleReadyLocale] = useState<string | null>(
    null,
  );
  const [facebookReady, setFacebookReady] = useState(false);
  const locale = useLocaleStore((s) => s.locale);
  const googleReady = googleReadyLocale === locale;

  const googleCallbackRef = useRef<((idToken: string) => void) | null>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || typeof window === "undefined") return;
    let cancelled = false;

    document
      .querySelectorAll<HTMLScriptElement>(`script[src^="${GOOGLE_GSI_SRC}"]`)
      .forEach((el) => el.remove());
    for (const key of Array.from(scriptPromises.keys())) {
      if (key.startsWith(GOOGLE_GSI_SRC)) scriptPromises.delete(key);
    }
    if (window.google?.accounts?.id) {
      delete (window as { google?: unknown }).google;
    }

    loadScript(`${GOOGLE_GSI_SRC}?hl=${locale}`)
      .then(() => {
        if (cancelled || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (resp: GoogleCredentialResponse) => {
            const cb = googleCallbackRef.current;
            if (cb && resp.credential) cb(resp.credential);
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          ux_mode: "popup",
        });
        setGoogleReadyLocale(locale);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    if (!FACEBOOK_APP_ID || typeof window === "undefined") return;
    let cancelled = false;
    window.fbAsyncInit = () => {
      if (cancelled || !window.FB) return;
      window.FB.init({
        appId: FACEBOOK_APP_ID,
        cookie: true,
        xfbml: false,
        version: "v18.0",
      });
      setFacebookReady(true);
    };
    loadScript(FACEBOOK_SDK_SRC).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const mountGoogleButton = useCallback(
    (
      container: HTMLElement,
      onToken: (idToken: string) => void,
      options: GoogleButtonOptions = {},
    ) => {
      if (!googleReady || !window.google?.accounts?.id) return;
      googleCallbackRef.current = onToken;
      container.innerHTML = "";
      window.google.accounts.id.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "center",
        width: container.clientWidth || 320,
        ...options,
      });
    },
    [googleReady],
  );

  const signInWithFacebook = useCallback(async (): Promise<string | null> => {
    if (!FACEBOOK_APP_ID) {
      throw new Error("Facebook login chưa được cấu hình");
    }
    if (!facebookReady || !window.FB) {
      throw new Error("Facebook SDK đang khởi tạo, vui lòng thử lại");
    }
    return new Promise<string | null>((resolve) => {
      window.FB!.login(
        (resp) => {
          if (resp.status === "connected" && resp.authResponse?.accessToken) {
            resolve(resp.authResponse.accessToken);
          } else {
            resolve(null);
          }
        },
        { scope: "email,public_profile" },
      );
    });
  }, [facebookReady]);

  return {
    googleConfigured: !!GOOGLE_CLIENT_ID,
    facebookConfigured: !!FACEBOOK_APP_ID,
    mountGoogleButton,
    googleReady,
    signInWithFacebook,
  };
}
