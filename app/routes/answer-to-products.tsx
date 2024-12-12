import type {Result} from '@coveo/headless';
import type {ActionFunctionArgs} from '@shopify/remix-oxygen';

export interface AnswerToProductData {
  results?: Result[];
  error?: Error;
}

export async function action({request}: ActionFunctionArgs) {
  const formData = await request.formData();
  const basicExpression =
    'PartialMatch(keywords=KeywordExpressionPartialMatchAtom(Water) KeywordExpressionPartialMatchAtom(skis) KeywordExpressionPartialMatchAtom(Surfboards) KeywordExpressionPartialMatchAtom(Kayaks) KeywordExpressionPartialMatchAtom(Stand-up) KeywordExpressionPartialMatchAtom(paddleboards) KeywordExpressionPartialMatchAtom(Wetsuits) KeywordExpressionPartialMatchAtom(Towable) KeywordExpressionPartialMatchAtom(tubes) KeywordExpressionPartialMatchAtom(Wakeboards) KeywordExpressionPartialMatchAtom(Rash) KeywordExpressionPartialMatchAtom(guards) KeywordExpressionPartialMatchAtom(Snorkeling) KeywordExpressionPartialMatchAtom(gear) KeywordExpressionPartialMatchAtom(Life) KeywordExpressionPartialMatchAtom(jackets); match=50%; pick=Unspecified(); stopWords=; noRanking=false; noHighlight=false)';
  //  formData.get('basicExpression');

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
