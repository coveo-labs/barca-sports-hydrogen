import {createCookie} from '@shopify/remix-oxygen';

export const accessTokenCookie = createCookie('coveo_accessToken', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
});
