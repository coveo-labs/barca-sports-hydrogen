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
    <div
      className="flex min-h-screen flex-col bg-white"
      style={{minHeight: '100svh'}}
    >
      <Header
        header={header}
        cart={cart}
        publicStoreDomain={publicStoreDomain}
      />

      <main className="flex flex-1 flex-col min-h-0">{children}</main>
      <Footer header={header} />
    </div>
  );
}
