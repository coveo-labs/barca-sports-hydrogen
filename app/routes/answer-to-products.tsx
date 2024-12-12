import type {Result} from '@coveo/headless';
import type {ActionFunctionArgs} from '@shopify/remix-oxygen';

export interface AnswerToProductsData {
  results?: Result[];
  error?: Error;
}

export async function action({request}: ActionFunctionArgs) {
  const formData = await request.formData();
  const basicExpression = formData.get('basicExpression');

  try {
    const res = await fetch(`https://platform.cloud.coveo.com/rest/search/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer xx697404a7-6cfd-48c6-93d1-30d73d17e07a',
      },
      body: JSON.stringify({
        q: basicExpression,
        cq: '@ec_category',
      }),
    });
    return await res.json();
  } catch (error) {
    return {error};
  }
}
