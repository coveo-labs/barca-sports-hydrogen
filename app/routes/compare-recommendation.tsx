import type {Product} from '@coveo/headless/ssr-commerce';
import type {ActionFunctionArgs} from '@shopify/remix-oxygen';

interface Intent {
  question: string;
  answer?: string;
}

export interface CompareRecommendationResponse {
  input: {
    comparedProducts: string[];
    mainProduct: string;
    intent: Intent[];
  };
  output: {
    clarification?: string;
    explanation?: string;
    product?: Product;
  };
}

export async function action({request}: ActionFunctionArgs) {
  const formData = await request.formData();
  const input = formData.get('input');
  if (!input) {
    return {error: 'No input provided'};
  }
  const parsed = JSON.parse(input as string);
  try {
    const res = await fetch(`http://127.0.0.1:5001/compare/recommendation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({input: parsed}),
    });
    return await res.json();
  } catch (error) {
    return {error};
  }
}
