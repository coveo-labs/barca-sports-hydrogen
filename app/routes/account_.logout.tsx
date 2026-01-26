import {redirect} from 'react-router';
import type {Route} from './+types/account_.logout';
import {shouldEnableCustomerAccounts} from '~/root';

// if we don't implement this, /account/logout will get caught by account.$.tsx to do login
export async function loader() {
  return redirect('/');
}

export async function action({context, request}: Route.ActionArgs) {
  // Check if customer accounts are enabled (auto-detects preview environments)
  const customerAccountsEnabled = shouldEnableCustomerAccounts(request, context.env);
  
  if (!customerAccountsEnabled) {
    return redirect('/');
  }

  return context.customerAccount.logout();
}
