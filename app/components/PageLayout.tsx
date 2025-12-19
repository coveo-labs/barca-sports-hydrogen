import type {
  CartApiQueryFragment,
  FooterQuery,
  HeaderQuery,
} from 'storefrontapi.generated';
import {useLocation} from 'react-router';
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
  const location = useLocation();
  const isGenerativePage = location.pathname.includes('/generative');

  return (
    <div
      className={isGenerativePage ? "flex h-screen flex-col bg-white" : "flex min-h-screen flex-col bg-white"}
      style={isGenerativePage ? {height: '100svh'} : {minHeight: '100svh'}}
    >
      <Header
        header={header}
        cart={cart}
        publicStoreDomain={publicStoreDomain}
      />

      <main className="flex flex-1 flex-col min-h-0">{children}</main>
      {!isGenerativePage && <Footer header={header} />}
    </div>
  );
}
