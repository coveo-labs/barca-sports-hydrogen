import type {LoaderFunctionArgs} from 'react-router';
import {shouldEnableCustomerAccounts} from '~/root';

export async function loader({context, request}: LoaderFunctionArgs) {
  // Check if customer accounts are enabled (auto-detects preview environments)
  const customerAccountsEnabled = shouldEnableCustomerAccounts(request, context.env);
  
  if (!customerAccountsEnabled) {
    throw new Response('Customer accounts are disabled', {status: 404});
  }

  return context.customerAccount.login();
}
