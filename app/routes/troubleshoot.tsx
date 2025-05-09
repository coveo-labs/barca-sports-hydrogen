import type {ActionFunctionArgs} from '@shopify/remix-oxygen';
export interface TroubleshootResponse {
  input: string;
  output: {answer: string; followupQuestions: string[]};
}

export async function action({request}: ActionFunctionArgs) {
  const formData = await request.formData();
  const input = formData.get('input');
  if (!input) {
    return {error: 'No input provided'};
  }
  try {
    const res = await fetch(`http://127.0.0.1:5001/troubleshoot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({input}),
    });
    const data = (await res.json()) as TroubleshootResponse;

    return data;
  } catch (error) {
    return {error};
  }
}
