"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Search,
  ShoppingCart,
  Bell,
  MessageCircle,
  User,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Settings,
  Package,
  Store,
  MessageSquare,
  Phone,
  Shield,
  Clock3,
} from "lucide-react";
import { Button, Avatar } from "@/shared/ui";
import { useAuthStore, useCartStore } from "@/stores";
import { useTranslation } from "@/hooks";
import {
  conversationService,
  merchantService,
  notificationService,
  searchHistoryService,
} from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { formatDateTime } from "@/shared/lib/utils";
import { logger } from "@/shared/lib/logger";
import {
  GUEST_RECENT_SEARCHES_KEY,
  mergeRecentSearches,
  readGuestRecentSearches,
  writeGuestRecentSearches,
} from "@/shared/lib/recent-searches";
import LanguageSwitcher from "./LanguageSwitcher";
import HeaderNavigation from "./HeaderNavigation";
import { categoryIcons, getNotiBg, pickInitial } from "./header-utils";

export default function Header() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);

  const { isAuthenticated, isInitializing, user, logout } = useAuthStore();
  const totalItems = useCartStore((s) =>
    s.items.reduce((sum, i) => sum + i.qty, 0),
  );
  const { t } = useTranslation();
  const userRoles = user?.roles ?? [];
  const hasSellerRole = userRoles.some((role) =>
    ["SELLER", "MERCHANT", "ROLE_SELLER", "ROLE_MERCHANT"].includes(role),
  );
  const hasAdminRole = userRoles.some((role) =>
    ["SYSTEM_ADMIN", "CS_ADMIN", "ROLE_SYSTEM_ADMIN", "ROLE_CS_ADMIN"].includes(
      role,
    ),
  );
  const sellOnAionnHref = isAuthenticated
    ? "/merchant/register"
    : "/auth/login?redirect=/merchant/register";
  const recentSearchQueryKey = qk.recentSearches(
    isAuthenticated ? (user?.userId ?? "authenticated") : "guest",
  );

  const { data: notifications } = useQuery({
    queryKey: qk.notifications(),
    queryFn: () => notificationService.listMine(50),
    enabled: isAuthenticated,
    refetchInterval: (query) => (query.state.error ? false : 60_000),
  });
  const { data: unreadChat } = useQuery({
    queryKey: qk.unreadCounts,
    queryFn: () => conversationService.unreadCounts(),
    enabled: isAuthenticated,
    refetchInterval: (query) => (query.state.error ? false : 30_000),
  });
  const { data: myMerchant } = useQuery({
    queryKey: ["merchant", "me"],
    queryFn: () => merchantService.getMine(),
    enabled: isAuthenticated && hasSellerRole,
    retry: false,
  });
  const { data: recentSearches = [] } = useQuery({
    queryKey: recentSearchQueryKey,
    queryFn: async () => {
      if (!isAuthenticated) return readGuestRecentSearches();

      const serverSearches = await searchHistoryService.getRecent();
      const guestSearches = readGuestRecentSearches();
      if (guestSearches.length === 0) return serverSearches;

      const merged = mergeRecentSearches(guestSearches, serverSearches);
      const saved = await searchHistoryService.record(merged);
      localStorage.removeItem(GUEST_RECENT_SEARCHES_KEY);
      return saved;
    },
    enabled: !isInitializing,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const hasMerchant =
    hasSellerRole && !!myMerchant && myMerchant.status !== "CLOSED";

  const unreadNotifications = (notifications ?? []).filter(
    (n) => !n.readAt,
  ).length;
  const unreadChats = unreadChat
    ? Object.values(unreadChat).reduce((s, n) => s + n, 0)
    : 0;

  useEffect(() => {
    if (!userMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [userMenuOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [searchOpen]);

  async function handleLogout() {
    setUserMenuOpen(false);
    await logout();
    toast.success(t("common.logoutSuccess"));
    router.push("/");
  }

  const recordRequestIdRef = useRef(0);

  function runSearch(value: string) {
    const q = value.trim();
    if (!q) return;
    const next = mergeRecentSearches([q], recentSearches);
    queryClient.setQueryData(recentSearchQueryKey, next);
    if (isAuthenticated) {
      const requestId = ++recordRequestIdRef.current;
      searchHistoryService
        .record([q])
        .then((saved) => {
          if (requestId === recordRequestIdRef.current) {
            queryClient.setQueryData(recentSearchQueryKey, saved);
          }
        })
        .catch((error) => logger.error("Failed to record recent search", error));
    } else {
      writeGuestRecentSearches(next);
    }
    setSearchQuery(q);
    setSearchOpen(false);
    router.push(`/products?q=${encodeURIComponent(q)}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    runSearch(searchQuery);
  }

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 border-b border-blue-800 shadow-md">
      <div className="bg-blue-950/35 border-b border-white/15 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-end gap-5 h-9 text-blue-50">
            <Link
              href="/feedback"
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <MessageSquare size={13} />
              <span className="font-medium">{t("common.feedback")}</span>
            </Link>
            <Link
              href="/contact"
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Phone size={13} />
              <span className="font-medium">{t("common.contactUs")}</span>
            </Link>
            <Link
              href={sellOnAionnHref}
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Store size={13} />
              <span className="font-medium">{t("common.sellOnAionn")}</span>
            </Link>
            <div className="relative group/noti py-1">
              <Link
                href={isAuthenticated ? "/notifications" : "/auth/login"}
                className="flex items-center gap-1.5 hover:text-white transition-colors relative"
              >
                <Bell size={13} />
                <span className="font-medium">{t("common.notifications")}</span>
                {isAuthenticated && unreadNotifications > 0 && (
                  <span className="ml-0.5 h-4 min-w-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                )}
              </Link>

              <div className="absolute right-0 top-full pt-2 w-[400px] hidden group-hover/noti:block z-50">
                <div className="bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden relative">
                  <div className="absolute -top-1.5 right-12 w-3 h-3 bg-white border-l border-t border-gray-200 rotate-45 z-10" />

                  {!isAuthenticated ? (
                    <div className="bg-white relative z-20">
                      <div className="flex flex-col items-center justify-center p-8">
                        <Image
                          src="/images/noti_login.png"
                          alt={t("common.loginToSeeNotifications")}
                          width={140}
                          height={140}
                          className="mb-4 object-contain"
                        />
                        <p className="text-gray-600 text-sm font-medium text-center">
                          {t("common.loginToSeeNotifications")}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 border-t border-gray-150 bg-gray-50/80 text-center text-sm font-medium">
                        <Link
                          href="/auth/register"
                          className="py-3 text-gray-700 hover:bg-gray-100 transition-colors border-r border-gray-150"
                        >
                          {t("common.register")}
                        </Link>
                        <Link
                          href="/auth/login"
                          className="py-3 text-orange-600 hover:bg-orange-50 transition-colors"
                        >
                          {t("common.login")}
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white relative z-20 flex flex-col">
                      <div className="px-4 py-2.5 border-b border-gray-100 text-[11px] font-semibold text-gray-400 bg-gray-50/50">
                        {t("common.newNotifications")}
                      </div>

                      <div className="max-h-[350px] overflow-y-auto divide-y divide-gray-100">
                        {(notifications ?? []).length === 0 ? (
                          <div className="py-12 text-center text-gray-500 text-sm">
                            <Bell
                              size={28}
                              className="mx-auto text-gray-300 mb-2"
                            />
                            {t("common.noNewNotifications")}
                          </div>
                        ) : (
                          (notifications ?? []).slice(0, 5).map((noti) => {
                            const isUnread = !noti.readAt;
                            return (
                              <Link
                                key={noti.notiId}
                                href={`/notifications`}
                                className={`flex gap-3 px-4 py-3 text-left transition-colors ${
                                  isUnread
                                    ? "bg-orange-50/45 hover:bg-orange-100/40"
                                    : "hover:bg-gray-50"
                                }`}
                              >
                                <div
                                  className={`h-10 w-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border ${getNotiBg(noti.category)}`}
                                >
                                  {categoryIcons[noti.category] ?? (
                                    <Bell size={16} className="text-gray-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4
                                    className={`text-xs text-gray-900 line-clamp-2 ${isUnread ? "font-bold" : "font-medium"}`}
                                  >
                                    {noti.subject || t("common.notifications")}
                                  </h4>
                                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                                    {noti.content}
                                  </p>
                                  <span className="text-[9px] text-gray-400 mt-1 block">
                                    {formatDateTime(noti.createdAt)}
                                  </span>
                                </div>
                              </Link>
                            );
                          })
                        )}
                      </div>

                      <Link
                        href="/notifications"
                        className="block py-2.5 text-center text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors border-t border-gray-100"
                      >
                        {t("common.seeAll")}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 flex-shrink-0 group"
          >
            <Image
              src="/images/logo_without_text.png"
              alt="Aionn"
              width={194}
              height={181}
              className="h-auto w-10 rounded-lg bg-white p-0.5 shadow-sm group-hover:scale-105 transition-transform"
            />
            <span className="text-2xl font-bold tracking-tight text-white">
              Aionn
            </span>
          </Link>

          <div
            ref={searchRef}
            className="relative hidden md:flex flex-1 max-w-2xl"
          >
            <form onSubmit={handleSearch} className="relative w-full group">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500 transition-colors"
                size={18}
              />
              <input
                type="text"
                placeholder={t("common.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/70 bg-white/95 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-white focus:ring-4 focus:ring-white/20 focus:outline-none focus:bg-white transition-all"
              />
            </form>
            {searchOpen && recentSearches.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white py-2 shadow-xl">
                <p className="px-4 pb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {t("common.recentSearches")}
                </p>
                {recentSearches.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => runSearch(item)}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Clock3 size={15} className="text-gray-400" />
                    <span className="truncate">{item}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {isAuthenticated ? (
              <>
                <Link
                  href="/chat"
                  className="relative p-2.5 rounded-xl hover:bg-white/15 text-white transition-colors"
                  aria-label="Messages"
                >
                  <MessageCircle size={20} />
                  {unreadChats > 0 && (
                    <span className="absolute top-1 right-1 h-4 min-w-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                      {unreadChats > 99 ? "99+" : unreadChats}
                    </span>
                  )}
                </Link>
                <Link
                  href={isAuthenticated ? "/cart" : "/auth/login"}
                  className="relative p-2.5 rounded-xl hover:bg-white/15 text-white transition-colors"
                  aria-label="Cart"
                >
                  <ShoppingCart size={20} />
                  {totalItems > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                      {totalItems}
                    </span>
                  )}
                </Link>
                <LanguageSwitcher />

                <div className="relative ml-1" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/15 text-white transition-colors"
                  >
                    {user?.avatarUrl ? (
                      <Avatar
                        src={user.avatarUrl}
                        alt={user.displayName ?? "U"}
                        size="sm"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <span className="text-xs font-bold text-blue-700">
                          {pickInitial(user)}
                        </span>
                      </div>
                    )}
                    <ChevronDown size={14} className="hidden lg:block" />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-100 shadow-lg py-2 z-50"
                      >
                        <div className="px-4 py-2 border-b border-gray-100 mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user?.displayName ??
                              user?.username ??
                              t("common.account")}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user?.email ?? user?.phone ?? ""}
                          </p>
                        </div>
                        <Link
                          href="/account"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <User size={16} /> {t("common.account")}
                        </Link>
                        <Link
                          href="/orders"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Package size={16} /> {t("common.orders")}
                        </Link>
                        {hasMerchant && (
                          <Link
                            href="/merchant/dashboard"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Store size={16} /> {t("common.sellerChannel")}
                          </Link>
                        )}
                        {hasAdminRole && (
                          <Link
                            href="/admin"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Shield size={16} /> {t("adminDashboard.title")}
                          </Link>
                        )}
                        <Link
                          href="/account/settings"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings size={16} /> {t("common.settings")}
                        </Link>
                        <div className="border-t border-gray-100 mt-1 pt-1">
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                          >
                            <LogOut size={16} /> {t("common.logout")}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <Link
                  href={isAuthenticated ? "/cart" : "/auth/login"}
                  className="relative p-2.5 rounded-xl hover:bg-white/15 text-white transition-colors"
                  aria-label="Cart"
                >
                  <ShoppingCart size={20} />
                  {totalItems > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                      {totalItems}
                    </span>
                  )}
                </Link>
                <Link href="/auth/register" className="ml-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/70 bg-white/10 text-white hover:bg-white hover:text-blue-700"
                  >
                    {t("common.register")}
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="focus:ring-white/40 shadow-sm"
                  >
                    {t("common.login")}
                  </Button>
                </Link>
                <LanguageSwitcher />
              </>
            )}

            <button
              className="md:hidden p-2.5 rounded-xl hover:bg-white/15 text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        <HeaderNavigation
          mobileOpen={mobileMenuOpen}
          sellHref={sellOnAionnHref}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
      </div>
    </header>
  );
}
