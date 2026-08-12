"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import { ChatInner } from "@/app/chat/page";

export default function MerchantChatPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <Suspense
        fallback={
          <div className="bg-gray-50 min-h-screen flex justify-center pt-32">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        }
      >
        <ChatInner variant="console" />
      </Suspense>
    </AuthGuard>
  );
}
