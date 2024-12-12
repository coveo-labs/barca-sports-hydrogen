import type {Result} from '@coveo/headless';
import type {ActionFunctionArgs} from '@shopify/remix-oxygen';

export interface AnswerToArticlesData {
  results?: Result[];
  basicExpression: string;
  error?: Error;
}

export async function action({request}: ActionFunctionArgs) {
  const formData = await request.formData();
  const answer = formData.get('answer');
  try {
    const res = await fetch(
      `https://aiproxy.poc.coveodemo.com/AnswerToProduct/v1`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answer,
          apikey: 'xx697404a7-6cfd-48c6-93d1-30d73d17e07a',
          searchhub: 'Sports Blog GenAI',
          orgid: 'barcagroupproductionkwvdy6lp',
        }),
      },
    );
    return await res.json();
  } catch (error) {
    return {error};
  }
}
