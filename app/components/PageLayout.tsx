import type {
  CartApiQueryFragment,
  FooterQuery,
  HeaderQuery,
} from 'storefrontapi.generated';
import {Footer} from '~/components/Footer';
import {Header} from '~/components/Header';

interface PageLayoutProps {
  cart: Promise<CartApiQueryFragment | null>;
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  publicStoreDomain: string;
  children?: React.ReactNode;
}

export function PageLayout({
  cart,
  children = null,
  header,
  publicStoreDomain,
}: PageLayoutProps) {
  return (
    <>
      <Header
        header={header}
        cart={cart}
        publicStoreDomain={publicStoreDomain}
      />

      <main>{children}</main>
      <Footer header={header} />
    </>
  );
}
