import type { ReactNode } from "react";

interface DefinitionRowProps {
  label: string;
  value: ReactNode;
  mono?: boolean;
}

export default function DefinitionRow({
  label,
  value,
  mono = false,
}: DefinitionRowProps) {
  return (
    <div className="px-6 py-3 grid grid-cols-3 gap-4 items-center">
      <dt className="text-xs text-gray-500 uppercase">{label}</dt>
      <dd
        className={`col-span-2 text-sm text-gray-900 ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
