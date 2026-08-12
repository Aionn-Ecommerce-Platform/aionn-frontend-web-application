import Sidebar from "./Sidebar";

interface MemberPageLayoutProps {
  children: React.ReactNode;
  contentClassName?: string;
}

export default function MemberPageLayout({
  children,
  contentClassName = "flex-1 min-w-0",
}: MemberPageLayoutProps) {
  return (
    <div className="member-page bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <Sidebar />
          <div className={contentClassName}>{children}</div>
        </div>
      </div>
    </div>
  );
}
