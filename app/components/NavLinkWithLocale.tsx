import {NavLink, type NavLinkProps, useParams} from '@remix-run/react';

interface NavLinkWithLocaleProps extends NavLinkProps {}
export function NavLinkWithLocale(props: NavLinkWithLocaleProps) {
  const params = useParams();
  let redirectURL = props.to as string;

  if (params.locale) {
    redirectURL = `${params.locale}${redirectURL}`;
  }

  return (
    <NavLink className={props.className} to={redirectURL}>
      {props.children}
    </NavLink>
  );
}

export function relativeLink(url: string) {
  return new URL(url).pathname;
}
