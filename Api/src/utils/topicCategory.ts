// Shared topic/category mapping helpers

export const INDEPENDENT_REVIEW_TOPIC = 'Independent Reviews';
export const INDEPENDENT_REVIEW_ALIASES = [
  'independent reviews',
  'independent review',
  'assurance',
  'assurance report',
  'assurance reports',
];

const TOPIC_LABELS = [
  'OC4IDS',
  INDEPENDENT_REVIEW_TOPIC,
  'Independent Review', // legacy label kept for fallback matching
  'Infrastructure Transparency Index',
  'Guidance Notes',
];

function normalizeCategoryName(value: string, activeTopics?: Set<string>): string | null {
  if (!value) return null;
  const lower = value.trim().toLowerCase();

  // Independent Review/Assurance aliases
  if (INDEPENDENT_REVIEW_ALIASES.includes(lower)) {
    return resolveIndependentReviewName(activeTopics);
  }

  if (lower === 'oc4ids' || lower === 'open contracting for infrastructure data standard') {
    return 'OC4IDS';
  }

  if (
    lower === 'infrastructure transparency index' ||
    lower === 'iti' ||
    lower === 'transparency index'
  ) {
    return 'Infrastructure Transparency Index';
  }

  if (lower === 'guidance notes' || lower === 'guidance') {
    return 'Guidance Notes';
  }

  if (TOPIC_LABELS.some(label => label.toLowerCase() === lower)) {
    const match = TOPIC_LABELS.find(label => label.toLowerCase() === lower);
    return match || null;
  }

  return null;
}

export function resolveIndependentReviewName(activeTopics?: Set<string>): string {
  if (activeTopics?.has(INDEPENDENT_REVIEW_TOPIC)) {
    return INDEPENDENT_REVIEW_TOPIC;
  }
  if (activeTopics?.has('Independent Review')) {
    return 'Independent Review';
  }
  return INDEPENDENT_REVIEW_TOPIC;
}

export function mapResourceToTopic(
  resource: any,
  options?: { activeTopics?: Set<string> }
): string {
  const activeTopics = options?.activeTopics;
  const independentReviewName = resolveIndependentReviewName(activeTopics);

  // Direct category mapping
  const directCategory = typeof resource?.category === 'string' ? resource.category : '';
  const directMatch = normalizeCategoryName(directCategory, activeTopics);
  if (directMatch) {
    return directMatch;
  }

  // Workstreams (primary classification)
  const workstreams: string[] = Array.isArray(resource?.workstreams) ? resource.workstreams : [];
  if (workstreams.map(w => w.toLowerCase()).includes('assurance')) {
    return independentReviewName;
  }

  // OC4IDS alignment
  const oc4idsAlignment: string[] = Array.isArray(resource?.oc4idsAlignment) ? resource.oc4idsAlignment : [];
  if (oc4idsAlignment.length > 0) {
    return 'OC4IDS';
  }

  // Tags
  const tags: string[] = Array.isArray(resource?.tags) ? resource.tags.map((t: string) => t.toLowerCase()) : [];
  if (tags.some(t => INDEPENDENT_REVIEW_ALIASES.includes(t) || t === 'independent review')) {
    return independentReviewName;
  }
  if (tags.some(t => t === 'oc4ids' || t === 'open contracting')) {
    return 'OC4IDS';
  }
  if (tags.some(t => t === 'infrastructure transparency index' || t === 'iti' || t === 'transparency index')) {
    return 'Infrastructure Transparency Index';
  }
  if (tags.some(t => t === 'guidance' || t === 'guidance note' || t === 'guidance notes')) {
    return 'Guidance Notes';
  }

  // Resource type
  if (resource?.resourceType === 'guidance') {
    return 'Guidance Notes';
  }

  // Default
  return 'Guidance Notes';
}
