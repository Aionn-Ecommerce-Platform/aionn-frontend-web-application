"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  required?: boolean;
}

export default function Select({
  label,
  value,
  onChange,
  options,
  placeholder = "Select option",
  disabled = false,
  error,
  className,
  required = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={cn("w-full relative", className)} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "w-full flex items-center justify-between rounded-xl border border-gray-400 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all cursor-pointer font-medium text-left shadow-sm min-w-0",
            disabled && "bg-gray-50 opacity-50 cursor-not-allowed",
            error &&
              "border-red-500 focus:border-red-500 focus:ring-red-500/10",
          )}
        >
          <span
            className={cn(
              "truncate mr-2 flex-1 min-w-0",
              !selectedOption && "text-gray-400",
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            size={16}
            className={cn(
              "text-gray-500 transition-transform duration-200 shrink-0",
              isOpen && "rotate-180",
            )}
          />
        </button>

        {isOpen && !disabled && (
          <div className="absolute left-0 mt-1.5 w-full bg-white rounded-xl border border-gray-400 shadow-lg py-1 z-50 max-h-60 overflow-y-auto">
            {options.map((opt) => {
              const isActive = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left truncate",
                    isActive && "bg-blue-50 text-blue-700 font-semibold",
                  )}
                >
                  <span className="truncate w-full">{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
