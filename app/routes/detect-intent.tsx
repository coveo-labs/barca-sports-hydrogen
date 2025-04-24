import type {ActionFunctionArgs} from '@shopify/remix-oxygen';

export interface DetectIntentResponse {
  input: string;
  output: {
    expandedOrReformulatedQuery: string;
    intent: number;
    reason: string;
  };
  agent: string;
}

export async function action({request}: ActionFunctionArgs) {
  const formData = await request.formData();
  const input = formData.get('input');

  try {
    const res = await fetch(`http://127.0.0.1:5000/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer xx697404a7-6cfd-48c6-93d1-30d73d17e07a',
      },
      body: JSON.stringify({
        input,
      }),
    });
    return await res.json();
  } catch (error) {
    return {error};
  }
}
