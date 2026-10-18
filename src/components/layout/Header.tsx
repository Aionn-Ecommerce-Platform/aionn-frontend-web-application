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
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button, Avatar } from "@/shared/ui";
import { useAuthStore, useCartStore } from "@/stores";
import { useTranslation, useDebounce } from "@/hooks";
import {
  conversationService,
  merchantService,
  notificationService,
  searchHistoryService,
  productService,
  recommendationService,
} from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { formatDateTime } from "@/shared/lib/utils";
import { logger } from "@/shared/lib/logger";
import type { Product, RecommendationItem } from "@/types";
import {
  GUEST_RECENT_SEARCHES_KEY,
  mergeRecentSearches,
  readGuestRecentSearches,
  writeGuestRecentSearches,
} from "@/shared/lib/recent-searches";
import LanguageSwitcher from "./LanguageSwitcher";
import HeaderNavigation from "./HeaderNavigation";
import { categoryIcons } from "./header-utils";

interface SearchDropdownProps {
  searchOpen: boolean;
  searchQuery: string;
  recentSearches: string[];
  trendingRecommendations: RecommendationItem[];
  liveSuggestions: Product[];
  isSuggestionsLoading: boolean;
  onSelectKeyword: (keyword: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function SearchDropdown({
  searchOpen,
  searchQuery,
  recentSearches,
  trendingRecommendations,
  liveSuggestions,
  isSuggestionsLoading,
  onSelectKeyword,
  t,
}: SearchDropdownProps) {
  if (!searchOpen) return null;

  const trimmedQuery = searchQuery.trim();

  // Mode 1: Empty input (History + Trending, max 5 items in total)
  if (!trimmedQuery) {
    const historyItems = recentSearches.slice(0, 5);
    const recommendLimit = Math.max(0, 5 - historyItems.length);
    const displayedTrending = trendingRecommendations.slice(0, recommendLimit);

    if (historyItems.length === 0 && displayedTrending.length === 0) {
      return null;
    }

    return (
      <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white py-2 shadow-xl">
        {historyItems.length > 0 && (
          <div className="py-1">
            <p className="px-4 pb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
              {t("common.recentSearches")}
            </p>
            {historyItems.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onSelectKeyword(item)}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
              >
                <Clock3 size={15} className="text-gray-400 shrink-0" />
                <span className="truncate">{item}</span>
              </button>
            ))}
          </div>
        )}

        {displayedTrending.length > 0 && (
          <div className={historyItems.length > 0 ? "pt-2 border-t border-gray-100" : "py-1"}>
            <p className="px-4 pb-1.5 pt-1 text-xs font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-500" />
              <span>{t("common.suggestedForYou")}</span>
            </p>
            {displayedTrending.map((item) => (
              <button
                key={item.productId}
                type="button"
                onClick={() => onSelectKeyword(item.name)}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
              >
                <Sparkles size={14} className="text-amber-500 shrink-0" />
                <span className="truncate">{item.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Mode 2: User is typing (Live autocomplete suggestions, max 5 items)
  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
      {isSuggestionsLoading && (
        <div className="py-6 flex items-center justify-center text-gray-400 gap-2">
          <Loader2 size={16} className="animate-spin text-brand" />
        </div>
      )}

      {!isSuggestionsLoading && liveSuggestions.length > 0 && (
        <div className="py-1">
          <p className="px-4 pb-1.5 pt-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {t("common.matchingProducts")}
          </p>
          {liveSuggestions.slice(0, 5).map((product) => (
            <button
              key={product.productId}
              type="button"
              onClick={() => onSelectKeyword(product.name)}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
            >
              <Search size={14} className="text-gray-400 shrink-0" />
              <span className="truncate">{product.name}</span>
            </button>
          ))}
        </div>
      )}

      {!isSuggestionsLoading && liveSuggestions.length === 0 && (
        <div className="px-4 py-5 text-center text-xs text-gray-500">
          {t("common.noSuggestions")}
        </div>
      )}

      <button
        type="button"
        onClick={() => onSelectKeyword(trimmedQuery)}
        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-brand hover:bg-brand/5 border-t border-gray-100 transition-colors cursor-pointer"
      >
        <Search size={14} />
        <span className="truncate">
          {t("common.viewAllResultsFor", { query: trimmedQuery })}
        </span>
      </button>
    </div>
  );
}

export default function Header() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const { isAuthenticated, isInitializing, user, logout } = useAuthStore();
  const totalItems = useCartStore((s) =>
    s.items.reduce((sum, i) => sum + i.qty, 0),
  );
  const { t } = useTranslation();
  const debouncedSearchQuery = useDebounce(searchQuery.trim(), 250);

  const { data: trendingRecommendations = [] } = useQuery({
    queryKey: ["search-trending-recommendations"],
    queryFn: () => recommendationService.getHomeFeed(5),
    enabled: searchOpen && !debouncedSearchQuery,
    staleTime: 5 * 60 * 1000,
  });

  const { data: liveSuggestions = [], isLoading: isSuggestionsLoading } = useQuery({
    queryKey: ["search-live-suggestions", debouncedSearchQuery],
    queryFn: () => productService.searchSuggestions(debouncedSearchQuery, 5),
    enabled: searchOpen && debouncedSearchQuery.length > 0,
    staleTime: 30 * 1000,
  });

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
      const cached =
        queryClient.getQueryData<string[]>(recentSearchQueryKey) ?? [];
      const pendingOptimistic = cached.filter(
        (q) => !serverSearches.some((s) => s.toLowerCase() === q.toLowerCase()),
      );

      if (guestSearches.length === 0 && pendingOptimistic.length === 0) {
        return serverSearches;
      }

      const merged = mergeRecentSearches(
        [...pendingOptimistic, ...guestSearches],
        serverSearches,
      );
      const saved = await searchHistoryService.record(merged);
      localStorage.removeItem(GUEST_RECENT_SEARCHES_KEY);
      return mergeRecentSearches(
        queryClient.getQueryData<string[]>(recentSearchQueryKey) ?? [],
        saved,
      );
    },
    enabled: !isInitializing,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const hasMerchant =
    hasSellerRole && !!myMerchant && myMerchant.status !== "CLOSED";

  const unreadNotifications = (notifications ?? []).filter(
    (n) => n.status !== "READ" && !n.readAt,
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
        .catch((error) =>
          logger.error("Failed to record recent search", error),
        );
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
    <header className="sticky top-0 z-40 bg-white border-b border-gray-950 shadow-xs">
      <div className="bg-gray-50 border-b border-gray-200 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-end gap-5 h-8 text-gray-600">
            <Link
              href="/feedback"
              className="flex items-center gap-1.5 hover:text-gray-900 transition-colors"
            >
              <MessageSquare size={13} />
              <span className="font-medium">{t("common.feedback")}</span>
            </Link>
            <Link
              href="/contact"
              className="flex items-center gap-1.5 hover:text-gray-900 transition-colors"
            >
              <Phone size={13} />
              <span className="font-medium">{t("common.contactUs")}</span>
            </Link>
            <Link
              href={sellOnAionnHref}
              className="flex items-center gap-1.5 hover:text-gray-900 transition-colors"
            >
              <Store size={13} />
              <span className="font-medium">{t("common.sellOnAionn")}</span>
            </Link>
            <div className="relative group/noti py-1">
              <Link
                href={isAuthenticated ? "/notifications" : "/auth/login"}
                className="flex items-center gap-1.5 hover:text-gray-900 transition-colors relative"
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
                                className={`flex gap-3 px-4 py-3 text-left transition-colors relative ${
                                  isUnread
                                    ? "bg-gray-100 hover:bg-gray-200/80"
                                    : "bg-white hover:bg-gray-50"
                                }`}
                              >
                                {isUnread && (
                                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gray-900" />
                                )}
                                <div
                                  className={`h-10 w-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border ${
                                    isUnread
                                      ? "bg-white border-gray-300"
                                      : "bg-gray-100 border-gray-200 opacity-60"
                                  }`}
                                >
                                  {categoryIcons[noti.category] ?? (
                                    <Bell size={16} className="text-gray-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4
                                    className={`text-xs line-clamp-2 ${
                                      isUnread
                                        ? "font-bold text-gray-950"
                                        : "font-normal text-gray-500"
                                    }`}
                                  >
                                    {noti.subject || t("common.notifications")}
                                  </h4>
                                  <p
                                    className={`text-[11px] mt-0.5 line-clamp-2 leading-relaxed ${
                                      isUnread ? "text-gray-700 font-medium" : "text-gray-400"
                                    }`}
                                  >
                                    {noti.content}
                                  </p>
                                  <span
                                    className={`text-[9px] mt-1 block ${
                                      isUnread ? "text-gray-600 font-semibold" : "text-gray-400"
                                    }`}
                                  >
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
            className="flex items-center gap-2 flex-shrink-0 group"
          >
            <Image
              src="/images/logo_without_text.png"
              alt="Aionn"
              width={194}
              height={181}
              className="h-auto w-10 rounded-lg group-hover:scale-105 transition-transform"
            />
            <span className="font-brand text-4xl font-bold text-brand hover:text-brand-strong transition-colors tracking-wide select-none leading-none translate-y-1">
              Aionn
            </span>
          </Link>

          <div
            ref={searchRef}
            className="relative hidden md:flex flex-1 max-w-2xl"
          >
            <form
              onSubmit={handleSearch}
              className="relative w-full group flex items-center"
            >
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10"
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={t("common.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                className="w-full pl-10 pr-20 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100/80 focus:bg-white text-sm text-gray-900 placeholder:text-gray-400 border border-gray-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-200 outline-none transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  aria-label={t("common.clearSearch")}
                  className="absolute right-11 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer z-10"
                >
                  <X size={16} />
                </button>
              )}
              <button
                type="submit"
                aria-label={t("common.search")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-gray-900 hover:bg-black text-white flex items-center justify-center transition-colors shadow-xs active:scale-95 cursor-pointer z-10"
              >
                <Search size={16} />
              </button>
            </form>
            <SearchDropdown
              searchOpen={searchOpen}
              searchQuery={searchQuery}
              recentSearches={recentSearches}
              trendingRecommendations={trendingRecommendations}
              liveSuggestions={liveSuggestions}
              isSuggestionsLoading={isSuggestionsLoading}
              onSelectKeyword={runSearch}
              t={t}
            />
          </div>

          <div className="flex items-center gap-1.5">
            {isAuthenticated ? (
              <>
                <Link
                  href="/chat"
                  className="relative p-2.5 rounded-xl hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors"
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
                  className="relative p-2.5 rounded-xl hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors"
                  aria-label="Cart"
                >
                  <ShoppingCart size={20} />
                  {totalItems > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-gray-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                      {totalItems}
                    </span>
                  )}
                </Link>
                <LanguageSwitcher />

                <div className="relative ml-1" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    <Avatar
                      src={user?.avatarUrl}
                      alt={user?.displayName ?? user?.username ?? "User"}
                      size="sm"
                      className="ring-2 ring-gray-200"
                    />
                    <ChevronDown size={14} className="hidden lg:block text-gray-500" />
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
                  className="relative p-2.5 rounded-xl hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors"
                  aria-label="Cart"
                >
                  <ShoppingCart size={20} />
                  {totalItems > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-gray-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                      {totalItems}
                    </span>
                  )}
                </Link>
                <Link href="/auth/register" className="ml-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-300 bg-white text-gray-800 hover:bg-gray-100 hover:text-black shadow-xs"
                  >
                    {t("common.register")}
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-gray-900 hover:bg-black text-white shadow-xs focus:ring-gray-300 border-none"
                  >
                    {t("common.login")}
                  </Button>
                </Link>
                <LanguageSwitcher />
              </>
            )}

            <button
              className="md:hidden p-2.5 rounded-xl hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors"
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
