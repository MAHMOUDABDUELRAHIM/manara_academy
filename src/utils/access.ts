export type AllowedSections = Record<string, string[]>;

function safeParse<T = any>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export function readAllowedSections(): AllowedSections {
  try {
    const raw = localStorage.getItem('allowedSections');
    const obj = safeParse<AllowedSections>(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch { return {}; }
}

export function isFeatureAllowed(featureId: string): boolean {
  let approved = false;
  let trialActive = false;
  try {
    approved = localStorage.getItem('isSubscriptionApproved') === 'true';
    trialActive = localStorage.getItem('trialActive') === 'true';
  } catch {}
  // If subscription is approved, allow the feature without per-plan section gating
  if (approved) return true;
  // During trial, do not block sections here
  if (trialActive) return true;
  const allowed = readAllowedSections();
  const sections = allowed[featureId] || [];
  return Array.isArray(sections) && sections.length > 0;
}

export function isSectionAllowed(featureId: string, sectionId: string): boolean {
  let approved = false;
  let trialActive = false;
  try {
    approved = localStorage.getItem('isSubscriptionApproved') === 'true';
    trialActive = localStorage.getItem('trialActive') === 'true';
  } catch {}
  // If subscription is approved, allow the section without per-plan gating
  if (approved) return true;
  // During trial, allow access
  if (trialActive) return true;
  const allowed = readAllowedSections();
  const sections = allowed[featureId] || [];
  return Array.isArray(sections) && sections.includes(sectionId);
}