import type { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

export default function FormField({
  label,
  hint,
  required = false,
  children,
}: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
