"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/shared/ui";
import { conversationService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { useAuthStore } from "@/stores";
import { useTranslation } from "@/hooks";

interface ContactCard {
  icon: LucideIcon;
  labelKey: string;
  value?: string;
  valueKey?: string;
  descriptionKey: string;
  valueClassName: string;
}

const CONTACT_CARDS: ContactCard[] = [
  {
    icon: Phone,
    labelKey: "contact.hotline",
    value: "+84 68068337",
    descriptionKey: "contact.directSupport",
    valueClassName: "text-xl font-black text-gray-950",
  },
  {
    icon: Mail,
    labelKey: "contact.email",
    value: "flourinetran@gmail.com",
    descriptionKey: "contact.fastResponse",
    valueClassName: "text-base font-bold text-gray-950 truncate",
  },
  {
    icon: MapPin,
    labelKey: "contact.address",
    valueKey: "contact.orgName",
    descriptionKey: "contact.addressValue",
    valueClassName: "text-sm font-semibold text-gray-900 leading-snug",
  },
  {
    icon: Clock,
    labelKey: "contact.workingHours",
    value: "24/7 (Full time)",
    descriptionKey: "contact.alwaysReady",
    valueClassName: "text-base font-bold text-brand",
  },
];

export default function ContactPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [startingSupport, setStartingSupport] = useState(false);

  async function handleSupportChat() {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=${encodeURIComponent("/contact")}`);
      return;
    }
    setStartingSupport(true);
    try {
      const conversation = await conversationService.startSupport({
        buyerDisplayName: user?.displayName ?? user?.username ?? undefined,
        buyerAvatarUrl: user?.avatarUrl ?? undefined,
      });
      router.push(
        `/chat?conversationId=${encodeURIComponent(conversation.conversationId)}`,
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setStartingSupport(false);
    }
  }

  return (
    <div className="min-h-screen py-8 lg:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 lg:mb-10 max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-950 tracking-tight">
            {t("contact.title")}
          </h1>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-400 p-6 sm:p-7 shadow-xs hover:border-brand/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                <MessageCircle size={24} />
              </div>
              <div className="space-y-1 max-w-2xl">
                <h2 className="text-base sm:text-lg font-bold text-gray-950">
                  {t("contact.liveChatTitle")}
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {t("contact.liveChatDescription")}
                </p>
              </div>
            </div>

            <Button
              onClick={handleSupportChat}
              loading={startingSupport}
              className="w-full sm:w-auto px-6 bg-brand hover:bg-brand-strong text-white font-semibold py-2.5 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 border-none flex items-center justify-center gap-2"
            >
              <MessageCircle size={16} />
              {t("contact.chatNow")}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CONTACT_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.labelKey}
                  className="bg-white rounded-2xl border border-gray-400 p-5 shadow-xs flex flex-col justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={26} className="shrink-0 text-brand" />
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {t(card.labelKey)}
                      </h3>
                      <p className={`mt-1 ${card.valueClassName}`}>
                        {card.valueKey ? t(card.valueKey) : card.value}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-300 leading-relaxed">
                    {t(card.descriptionKey)}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-purple-800/60 bg-gradient-to-br from-purple-900 via-indigo-950 to-purple-950 p-6 sm:p-8 text-white shadow-xl shadow-purple-950/20">
            <div className="pointer-events-none absolute -left-14 -top-14 h-48 w-48 rounded-full bg-purple-600/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 right-8 h-48 w-48 rounded-full bg-fuchsia-600/20 blur-3xl" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">
                  {t("feedback.title")}
                </h2>
              </div>
              <Link href="/feedback" className="shrink-0">
                <Button className="w-full sm:w-auto px-6 bg-white !text-purple-950 hover:!bg-amber-300 hover:!text-purple-950 font-bold py-2.5 rounded-xl shadow-xs transition-all border-none flex items-center justify-center gap-2">
                  {t("feedback.submit")}
                  <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
