"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
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

interface DropdownPosition {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

const DROPDOWN_MIN_WIDTH = 220;
const DROPDOWN_MAX_HEIGHT = 240;

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
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState<DropdownPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideTrigger = containerRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideTrigger && !insideDropdown) {
        setIsOpen(false);
      }
    };
    const handleScroll = (event: Event) => {
      if (
        dropdownRef.current &&
        event.target instanceof Node &&
        dropdownRef.current.contains(event.target)
      ) {
        return;
      }
      setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    const handleResize = () => setIsOpen(false);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("scroll", handleScroll, true);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 8;
    const width = Math.min(
      Math.max(rect.width, DROPDOWN_MIN_WIDTH),
      window.innerWidth - viewportPadding * 2,
    );
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const openUp = spaceBelow < DROPDOWN_MAX_HEIGHT && spaceAbove > spaceBelow;
    const maxHeight = Math.max(
      120,
      Math.min(DROPDOWN_MAX_HEIGHT, openUp ? spaceAbove : spaceBelow),
    );
    const left = Math.max(
      viewportPadding,
      Math.min(rect.left, window.innerWidth - width - viewportPadding),
    );
    setPosition(
      openUp
        ? {
            left,
            width,
            maxHeight,
            bottom: window.innerHeight - rect.top + viewportPadding - 2,
          }
        : {
            left,
            width,
            maxHeight,
            top: rect.bottom + viewportPadding - 2,
          },
    );
  };

  const toggle = () => {
    if (!isOpen) {
      updatePosition();
      const selectedIndex = options.findIndex((opt) => opt.value === value);
      setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
    setIsOpen((prev) => !prev);
  };

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        updatePosition();
        setActiveIndex(event.key === "ArrowDown" ? 0 : options.length - 1);
        setIsOpen(true);
        return;
      }
      setActiveIndex((prev) => {
        const delta = event.key === "ArrowDown" ? 1 : -1;
        return (prev + delta + options.length) % options.length;
      });
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      if (!isOpen) return;
      event.preventDefault();
      const option = options[activeIndex];
      if (option) {
        onChange(option.value);
        setIsOpen(false);
      }
      return;
    }
    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      setIsOpen(false);
    }
  };

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
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={toggle}
          onKeyDown={handleTriggerKeyDown}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className={cn(
            "w-full flex items-center justify-between rounded-xl border border-gray-400 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none transition-all cursor-pointer font-medium text-left shadow-sm min-w-0",
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
      </div>
      {isOpen &&
        !disabled &&
        position &&
        createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            style={{
              position: "fixed",
              left: position.left,
              width: position.width,
              top: position.top,
              bottom: position.bottom,
              maxHeight: position.maxHeight,
            }}
            className="z-[100] overflow-y-auto rounded-2xl border border-gray-300 bg-white py-1 shadow-lg"
          >
            {options.map((opt, index) => {
              const isActive = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center px-4 py-2.5 text-sm text-gray-700 transition-colors text-left truncate",
                    index === activeIndex && "bg-gray-50",
                    isActive && "bg-blue-50 text-blue-700 font-semibold",
                  )}
                >
                  <span className="truncate w-full">{opt.label}</span>
                </button>
              );
            })}
          </div>,
          document.body,
        )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
