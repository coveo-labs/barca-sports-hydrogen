import {resolveProductIdFromAttributes} from '~/lib/product-identifier';

export type PendingRichContentType =
  | 'carousel'
  | 'product_ref'
  | 'nextaction'
  | 'refinement_chip';

export type PendingRichContent = {
  type: PendingRichContentType;
  partialText: string;
};

export type NextAction =
  | {type: 'search'; query: string}
  | {type: 'followup'; message: string};

export type RefinementChip = {
  facet: string;
  value: string;
  label: string;
};

export type MessageSegment =
  | {type: 'text'; value: string}
  | {type: 'carousel'; identifiers: string[]};

export const PRODUCT_REF_PATTERN = String.raw`<product_ref\b([^>]*)\s*/>`;
const CAROUSEL_PATTERN = String.raw`<carousel>([\s\S]*?)</carousel>`;
const NEXT_ACTION_PATTERN = String.raw`<nextaction\b([^>]*)\s*/>`;
const REFINEMENT_CHIP_PATTERN = String.raw`<refinement_chip\b([^>]*)\s*/>`;

const INCOMPLETE_CAROUSEL_PATTERN = /<carousel(?:>[\s\S]*)?$/;
const INCOMPLETE_PRODUCT_REF_PATTERN = /<product_ref[^>]*$/;
const INCOMPLETE_NEXT_ACTION_PATTERN = /<nextaction[^>]*$/;
const INCOMPLETE_REFINEMENT_CHIP_PATTERN = /<refinement_chip[^>]*$/;

const ATTRIBUTE_PATTERN = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;

const PARTIAL_TAG_PREFIXES = [
  {prefix: '<carousel', type: 'carousel' as const, minLength: 2},
  {prefix: '<product_ref', type: 'product_ref' as const, minLength: 3},
  {prefix: '<nextaction', type: 'nextaction' as const, minLength: 3},
  {prefix: '<refinement_chip', type: 'refinement_chip' as const, minLength: 3},
];

export function detectPendingRichContent(
  content: string,
): PendingRichContent | null {
  return (
    detectIncompleteCarousel(content) ??
    detectIncompleteProductRef(content) ??
    detectIncompleteNextAction(content) ??
    detectIncompleteRefinementChip(content) ??
    detectPartialTagStart(content)
  );
}

export function splitContentByCarousels(content: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  let cursor = 0;
  const carouselPattern = new RegExp(CAROUSEL_PATTERN, 'gi');
  let match: RegExpExecArray | null;

  while ((match = carouselPattern.exec(content)) !== null) {
    const matchIndex = match.index ?? 0;

    if (matchIndex > cursor) {
      segments.push({type: 'text', value: content.slice(cursor, matchIndex)});
    }

    const rawCarousel = match[0] ?? '';
    const innerMarkup = match[1] ?? '';
    const identifiers = extractProductRefsFromMarkup(innerMarkup);

    if (identifiers.length > 0) {
      segments.push({type: 'carousel', identifiers});
    } else {
      segments.push({type: 'text', value: rawCarousel});
    }

    cursor = matchIndex + rawCarousel.length;
  }

  if (cursor < content.length) {
    segments.push({type: 'text', value: content.slice(cursor)});
  }

  return segments;
}

export function extractProductRefsFromMarkup(markup: string): string[] {
  const identifiers: string[] = [];
  const productPattern = new RegExp(PRODUCT_REF_PATTERN, 'gi');
  let match: RegExpExecArray | null;

  while ((match = productPattern.exec(markup)) !== null) {
    const rawAttributes = match[1] ?? '';
    const attributes = parseAttributes(rawAttributes);
    const identifier = resolveProductIdentifierFromAttributes(attributes);
    if (identifier) {
      identifiers.push(identifier);
    }
  }

  return identifiers;
}

export type InlineProductRef = {
  identifier: string | null;
  startIndex: number;
  endIndex: number;
};

export function extractInlineProductRefs(text: string): InlineProductRef[] {
  const refs: InlineProductRef[] = [];
  const pattern = new RegExp(PRODUCT_REF_PATTERN, 'gi');
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const rawAttributes = match[1] ?? '';
    const attributes = parseAttributes(rawAttributes);
    const identifier = resolveProductIdentifierFromAttributes(attributes);
    refs.push({
      identifier,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return refs;
}

export function extractNextActions(content: string): {
  cleanedContent: string;
  nextActions: NextAction[];
} {
  const nextActions: NextAction[] = [];
  const pattern = new RegExp(NEXT_ACTION_PATTERN, 'gi');
  let cleanedContent = content;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const rawAttributes = match[1] ?? '';
    const attributes = parseAttributes(rawAttributes);
    const actionType = attributes.type;

    if (actionType === 'search' && attributes.query) {
      nextActions.push({type: 'search', query: attributes.query});
    } else if (actionType === 'followup' && attributes.message) {
      nextActions.push({type: 'followup', message: attributes.message});
    }

    cleanedContent = cleanedContent.replace(match[0], '');
  }

  return {cleanedContent: cleanedContent.trimEnd(), nextActions};
}

export function extractRefinementChips(content: string): {
  cleanedContent: string;
  refinementChips: RefinementChip[];
} {
  const refinementChips: RefinementChip[] = [];
  const pattern = new RegExp(REFINEMENT_CHIP_PATTERN, 'gi');
  let cleanedContent = content;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const rawAttributes = match[1] ?? '';
    const attributes = parseAttributes(rawAttributes);
    const {facet, value} = attributes;

    if (facet && value) {
      const valueParts = value.split('|');
      const label = valueParts.at(-1) ?? value;
      refinementChips.push({facet, value, label});
    }

    cleanedContent = cleanedContent.replace(match[0], '');
  }

  return {cleanedContent: cleanedContent.trimEnd(), refinementChips};
}

export function parseAttributes(raw: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const pattern = new RegExp(ATTRIBUTE_PATTERN);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(raw)) !== null) {
    const key = match[1];
    const value = match[3] ?? match[4] ?? '';
    if (key) {
      attributes[key] = value;
    }
  }

  return attributes;
}

export function resolveProductIdentifierFromAttributes(
  attributes: Record<string, string>,
): string | null {
  return resolveProductIdFromAttributes(attributes);
}

export function hasSpecialMarkup(content: string): boolean {
  return (
    content.includes('<product_ref') ||
    content.includes('<carousel') ||
    content.includes('<nextaction') ||
    content.includes('<refinement_chip')
  );
}

export function hasPotentialStreamingMarkup(content: string): boolean {
  return (
    content.includes('<c') ||
    content.includes('<p') ||
    content.includes('<n') ||
    content.includes('<r')
  );
}

function detectIncompleteCarousel(content: string): PendingRichContent | null {
  const match = INCOMPLETE_CAROUSEL_PATTERN.exec(content);
  if (!match || content.includes('</carousel>')) {
    return null;
  }

  const lastCarouselStart = content.lastIndexOf('<carousel');
  if (lastCarouselStart === -1) {
    return null;
  }

  const afterCarousel = content.slice(lastCarouselStart);
  if (afterCarousel.includes('<carousel>') || afterCarousel === '<carousel') {
    return {type: 'carousel', partialText: afterCarousel};
  }

  return null;
}

function detectIncompleteProductRef(
  content: string,
): PendingRichContent | null {
  const match = INCOMPLETE_PRODUCT_REF_PATTERN.exec(content);
  return match ? {type: 'product_ref', partialText: match[0]} : null;
}

function detectIncompleteNextAction(
  content: string,
): PendingRichContent | null {
  const match = INCOMPLETE_NEXT_ACTION_PATTERN.exec(content);
  return match ? {type: 'nextaction', partialText: match[0]} : null;
}

function detectIncompleteRefinementChip(
  content: string,
): PendingRichContent | null {
  const match = INCOMPLETE_REFINEMENT_CHIP_PATTERN.exec(content);
  return match ? {type: 'refinement_chip', partialText: match[0]} : null;
}

function detectPartialTagStart(content: string): PendingRichContent | null {
  const lastLtIndex = content.lastIndexOf('<');
  if (lastLtIndex === -1) {
    return null;
  }

  const potentialPartial = content.slice(lastLtIndex).toLowerCase();

  for (const {prefix, type, minLength} of PARTIAL_TAG_PREFIXES) {
    if (
      prefix.startsWith(potentialPartial) &&
      potentialPartial.length >= minLength
    ) {
      return {type, partialText: content.slice(lastLtIndex)};
    }
  }

  return null;
}
