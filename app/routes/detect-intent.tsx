import type {ActionFunctionArgs} from '@shopify/remix-oxygen';

export interface DetectIntentResponse {
  input: string;
  output: {
    expandedOrReformulatedQuery: string;
    intent: number;
    reason: string;
    intentHumanReadable: string;
  };
  agent: string;
}

export async function action({request}: ActionFunctionArgs) {
  const formData = await request.formData();
  const input = formData.get('input');

  try {
    const res = await fetch(`http://127.0.0.1:5001/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
