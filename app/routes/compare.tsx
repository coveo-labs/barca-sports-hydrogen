import type {ActionFunctionArgs} from '@shopify/remix-oxygen';

export interface CompareResponse {
  input: {
    comparedProducts: string[];
    mainProduct: string;
  };
  output: {
    comparisonTable: string;
  };
}

export async function action({request}: ActionFunctionArgs) {
  const formData = await request.formData();
  const input = formData.get('input');
  if (!input) {
    return {error: 'No input provided'};
  }
  const parsed = JSON.parse(input as string);
  console.log('parsed', input);
  try {
    const res = await fetch(`http://127.0.0.1:5001/compare`, {
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
