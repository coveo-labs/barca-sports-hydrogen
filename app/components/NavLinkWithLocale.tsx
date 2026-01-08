import {NavLink, useParams, type NavLinkProps} from 'react-router';

type NavLinkWithLocaleProps = NavLinkProps;
export function NavLinkWithLocale(props: NavLinkWithLocaleProps) {
  const params = useParams();
  let redirectURL = props.to as string;

  if (params.locale) {
    redirectURL = `${params.locale}${redirectURL}`;
  }

  return (
    <NavLink
      className={props.className}
      to={redirectURL}
      onClick={props.onClick}
    >
      {props.children}
    </NavLink>
  );
}

export function relativeLink(url: string) {
  return new URL(url).pathname;
}
