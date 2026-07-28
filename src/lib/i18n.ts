export type Language = 'ko' | 'en';

export const translations = {
  ko: {
    // Navigation Sidebar
    navLinks: "링크 목록",
    navProfile: "프로필",
    navDesign: "디자인",
    navAnalytics: "통계 분석",
    navMarketing: "마케팅 & DM",
    navGrowth: "고객 데이터",
    navSettings: "설정",
    navLogout: "로그아웃",

    // Header Bar
    myLinkZip: "내 링크집:",
    copy: "복사",
    copied: "복사됨!",
    share: "공유",
    save: "저장",
    cancel: "취소",
    unsavedChanges: "● 저장되지 않은 변경사항",

    // Section Titles
    linksTitle: "링크 및 블록 관리",
    profileTitle: "프로필 & 브랜드 설정",
    designTitle: "디자인 & 테마 스타일",
    analyticsTitle: "페이지 조회수 & CTR 분석",
    marketingTitle: "인스타그램 DM & 카카오 알림톡 자동화",
    growthTitle: "고객 데이터 및 운영",
    settingsTitle: "계정 및 도메인 설정",

    // Toast
    toastSaving: "저장 중입니다...",
    toastSaved: "🎉 설정이 성공적으로 저장되었습니다!",
    toastError: "❌ 저장 중 오류가 발생했습니다.",
    toastSubtext: "최신 설정이 안전하게 보관되었습니다.",

    // Language Dropdown
    korean: "🇰🇷 한국어",
    english: "🇺🇸 English",
  },
  en: {
    // Navigation Sidebar
    navLinks: "Links",
    navProfile: "Profile",
    navDesign: "Design",
    navAnalytics: "Analytics",
    navMarketing: "Marketing & DM",
    navGrowth: "Customer Data",
    navSettings: "Settings",
    navLogout: "Logout",

    // Header Bar
    myLinkZip: "My LinkZip:",
    copy: "Copy",
    copied: "Copied!",
    share: "Share",
    save: "Save",
    cancel: "Cancel",
    unsavedChanges: "● Unsaved Changes",

    // Section Titles
    linksTitle: "Links & Blocks",
    profileTitle: "Profile & Branding",
    designTitle: "Design & Themes",
    analyticsTitle: "Analytics & CTR",
    marketingTitle: "Marketing & DM Automation",
    growthTitle: "Customer Data & Operations",
    settingsTitle: "Settings & Domain",

    // Toast
    toastSaving: "Saving...",
    toastSaved: "🎉 Settings saved successfully!",
    toastError: "❌ Error saving settings.",
    toastSubtext: "Your latest changes have been safely stored.",

    // Language Dropdown
    korean: "🇰🇷 Korean",
    english: "🇺🇸 English",
  }
};

export const t = (key: keyof typeof translations['ko'], lang: Language = 'ko'): string => {
  return translations[lang]?.[key] || translations['ko'][key] || key;
};
