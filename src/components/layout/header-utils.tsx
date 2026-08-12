import { Bell, MessageCircle, Package, Shield, Ticket } from "lucide-react";

export const categoryIcons: Record<string, React.ReactNode> = {
  ORDER: <Package size={16} className="text-blue-500" />,
  PROMOTION: <Ticket size={16} className="text-orange-500" />,
  CHAT: <MessageCircle size={16} className="text-green-500" />,
  SECURITY: <Shield size={16} className="text-red-500" />,
  SYSTEM: <Bell size={16} className="text-gray-500" />,
};

export function getNotiBg(category: string) {
  const colors: Record<string, string> = {
    ORDER: "bg-blue-50 border-blue-100",
    PROMOTION: "bg-orange-50 border-orange-100",
    CHAT: "bg-green-50 border-green-100",
    SECURITY: "bg-red-50 border-red-100",
  };
  return colors[category] ?? "bg-gray-50 border-gray-100";
}

export function pickInitial(
  user: {
    displayName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null,
) {
  const source =
    user?.displayName?.trim() ||
    user?.email?.trim() ||
    user?.phone?.trim() ||
    "U";
  return source[0]?.toUpperCase() ?? "U";
}
