import type {ConversationThinkingUpdate} from '~/types/conversation';

export const INITIAL_PROGRESS_STEP = 'Understanding your request';
export const SUMMARY_PROGRESS_STEP = 'Writing the summary';

type ToolProgressDefinition = {
  stepLabel: string;
  bulletLabel: string;
};

const TOOL_PROGRESS_BY_NAME: Record<string, ToolProgressDefinition> = {
  store_reference_context: {
    stepLabel: 'Reviewing previous conversation',
    bulletLabel: 'Using messages and products from earlier in the chat',
  },
  discover_facets: {
    stepLabel: 'Finding matching products',
    bulletLabel: 'Checking related categories and facets',
  },
  coveo_commerce_catalog_facets: {
    stepLabel: 'Finding matching products',
    bulletLabel: 'Checking related categories and facets',
  },
  query_suggest: {
    stepLabel: 'Refining the search',
    bulletLabel: 'Using query suggestions to improve the search terms',
  },
  coveo_query_suggest: {
    stepLabel: 'Refining the search',
    bulletLabel: 'Using query suggestions to improve the search terms',
  },
  search_discovery: {
    stepLabel: 'Finding matching products',
    bulletLabel: 'Searching the catalog for products that match the request',
  },
  search_comparison: {
    stepLabel: 'Finding comparable products',
    bulletLabel: 'Searching for products with attributes to compare',
  },
  search_bundle: {
    stepLabel: 'Finding bundle options',
    bulletLabel: 'Searching for complementary products that work together',
  },
  search_research: {
    stepLabel: 'Researching product attributes',
    bulletLabel: 'Searching for product details for deeper guidance',
  },
  coveo_commerce_search: {
    stepLabel: 'Searching the product catalog',
    bulletLabel: 'Retrieving relevant products from the product catalog',
  },
  store_render_plan: {
    stepLabel: 'Organizing the best options',
    bulletLabel: 'Planning how to display the selected results',
  },
  render_carousel: {
    stepLabel: 'Preparing results',
    bulletLabel: 'Building a product carousel from the selected options',
  },
  render_product_carousel: {
    stepLabel: 'Preparing results',
    bulletLabel: 'Building a product carousel from the selected options',
  },
  render_comparison_table: {
    stepLabel: 'Preparing the comparison',
    bulletLabel: 'Building a side-by-side product comparison table',
  },
  render_comparison_summary: {
    stepLabel: 'Summarizing the key tradeoffs',
    bulletLabel: 'Highlighting the key differences between products',
  },
  render_bundle: {
    stepLabel: 'Preparing the bundle',
    bulletLabel: 'Organizing complementary products into a complete set',
  },
  render_product_research_card: {
    stepLabel: 'Preparing product guidance',
    bulletLabel: 'Building detailed guidance for the recommended product',
  },
  render_next_actions: {
    stepLabel: 'Preparing next steps',
    bulletLabel: 'Generating useful follow-up suggestions',
  },
};

export type ThinkingProgressStep = {
  id: string;
  label: string;
  bullets: string[];
  isActive: boolean;
};

export function mapToolCallToProgress(
  toolCallName: string | null | undefined,
): ToolProgressDefinition | null {
  if (!toolCallName) {
    return null;
  }

  const normalized = toolCallName.trim();
  if (!normalized) {
    return null;
  }

  return TOOL_PROGRESS_BY_NAME[normalized] ?? null;
}

export function buildThinkingProgressSteps(
  updates: ConversationThinkingUpdate[],
  isStreaming: boolean,
): ThinkingProgressStep[] {
  const steps: Array<{
    id: string;
    label: string;
    bullets: string[];
  }> = [];

  for (const update of updates) {
    const text = update.text.trim();
    if (!text || update.kind === 'reasoning') {
      continue;
    }

    if (update.kind === 'status') {
      if (steps.at(-1)?.label === text) {
        continue;
      }

      steps.push({
        id: update.id,
        label: text,
        bullets: [],
      });
      continue;
    }

    const currentStep = steps.at(-1);
    if (!currentStep) {
      continue;
    }

    if (!currentStep.bullets.includes(text)) {
      currentStep.bullets.push(text);
    }
  }

  return steps.map((step, index) => ({
    ...step,
    isActive: isStreaming && index === steps.length - 1,
  }));
}
