import React, { useMemo, useState } from "react";
import { Mail, Phone, Search, X } from "lucide-react";
import { availableIcons, getLinkIcon, type IconComponent } from "../../lib/icons";

interface SNSPlatformPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (platform: string) => void;
}

interface SNSPlatformOption {
  id: string;
  label: string;
  icon: IconComponent;
  keywords?: string[];
}

const primaryOptions: SNSPlatformOption[] = [
  { id: "globe", label: "웹사이트", icon: getLinkIcon("globe"), keywords: ["website", "url", "홈페이지"] },
  { id: "mail", label: "이메일", icon: Mail, keywords: ["email", "메일"] },
  { id: "phone", label: "전화번호", icon: Phone, keywords: ["phone", "연락처", "전화"] },
];

const socialOptions: SNSPlatformOption[] = availableIcons
  .filter((item) => item.category === "sns")
  .map((item) => ({
    id: item.id,
    label: item.name,
    icon: item.icon,
    keywords: item.tags,
  }));

export const SNSPlatformPickerModal: React.FC<SNSPlatformPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [query, setQuery] = useState("");
  const options = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const allOptions = [...primaryOptions, ...socialOptions];
    if (!normalizedQuery) return allOptions;
    return allOptions.filter((option) =>
      option.label.toLowerCase().includes(normalizedQuery) ||
      option.id.toLowerCase().includes(normalizedQuery) ||
      option.keywords?.some((keyword) => keyword.toLowerCase().includes(normalizedQuery)),
    );
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]">
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-gray-200 bg-[#F1F3F5] shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-5">
          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-950">SNS 아이콘 선택</h2>
            <p className="mt-1 text-xs font-semibold text-gray-500">추가할 채널을 선택해 주세요.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-black" aria-label="SNS 선택창 닫기">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="space-y-2">
            {options.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelect(option.id)}
                  className="flex w-full cursor-pointer items-center gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-left transition hover:border-black hover:shadow-sm"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center text-gray-950">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="text-sm font-black text-gray-950">{option.label}</span>
                </button>
              );
            })}
            {options.length === 0 && (
              <div className="rounded-2xl bg-white px-5 py-10 text-center text-sm font-bold text-gray-400">검색 결과가 없습니다.</div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-white p-4 sm:p-5">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="SNS 검색"
              className="h-13 w-full rounded-2xl border border-gray-300 bg-white pl-12 pr-4 text-sm font-bold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-black focus:ring-3 focus:ring-gray-100"
              autoFocus
            />
          </label>
        </div>
      </div>
    </div>
  );
};
