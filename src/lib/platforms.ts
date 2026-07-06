// R.1: сворачиваем platforms[] в максимум два иконки-бейджа — "PC" и "Mobile".
// PC: любая из PC/Steam/VK Play. Mobile: любая из Android/iOS.
const PC_HINTS = ['pc', 'steam', 'vk play'];
const MOBILE_HINTS = ['android', 'ios'];

const MONITOR_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/></svg>';
const SMARTPHONE_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>';

export type PlatformBadge = { key: 'pc' | 'mobile'; label: string; svg: string };

export function platformBadges(platforms: string[], labels?: { pc?: string; mobile?: string }): PlatformBadge[] {
  const lower = (platforms ?? []).map((p) => p.toLowerCase());
  const hasPc = lower.some((p) => PC_HINTS.some((h) => p.includes(h)));
  const hasMobile = lower.some((p) => MOBILE_HINTS.some((h) => p.includes(h)));
  const badges: PlatformBadge[] = [];
  if (hasPc) badges.push({ key: 'pc', label: labels?.pc ?? 'PC', svg: MONITOR_SVG });
  if (hasMobile) badges.push({ key: 'mobile', label: labels?.mobile ?? 'Mobile', svg: SMARTPHONE_SVG });
  return badges;
}
