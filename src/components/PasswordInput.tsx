"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  autoComplete?: string;
};

export function PasswordInput({
  value,
  onChange,
  placeholder,
  required,
  className,
  autoComplete,
}: PasswordInputProps) {
  const t = useTranslations("common");
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        required={required}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${className ?? ""} pr-11`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? t("hidePassword") : t("showPassword")}
        className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full text-muted hover:text-foreground transition focus-ring"
      >
        {visible ? (
          <EyeOff className="size-5" strokeWidth={2} aria-hidden />
        ) : (
          <Eye className="size-5" strokeWidth={2} aria-hidden />
        )}
      </button>
    </div>
  );
}
