import {NavLink, useLoaderData, type MetaFunction} from '@remix-run/react';
import type {LoaderFunctionArgs} from '@remix-run/server-runtime';
import {Image, Money} from '@shopify/hydrogen';
import {useEffect} from 'react';
import {ProductCard} from '~/components/Coveo/ProductCard';
import {RecommendationsList} from '~/components/Coveo/RecommendationsList';
import {Hero} from '~/components/Hero';
import {
  engineDefinition,
  searchEngineDefinition,
  standaloneEngineDefinition,
  useHomepageRecommendations,
} from '~/lib/coveo.engine';
import {HEADER_QUERY} from '~/lib/fragments';
import {ServerSideNavigatorContextProvider} from '~/lib/navigator.provider';
import relativeLink from '~/lib/relative.link';

export const meta: MetaFunction = () => {
  return [{title: 'Hydrogen | Home'}];
};

export async function loader({request, context}: LoaderFunctionArgs) {
  standaloneEngineDefinition.setNavigatorContextProvider(
    () => new ServerSideNavigatorContextProvider(request),
  );

  const cart = await context.cart.get();

  const staticState = await standaloneEngineDefinition.fetchStaticState({
    controllers: {
      searchParameter: {initialState: {parameters: {q: ''}}},
      cart: {
        initialState: {
          items: cart
            ? cart.lines.nodes.map((node) => {
                const {merchandise} = node;
                return {
                  productId: merchandise.product.id,
                  name: merchandise.product.title,
                  price: Number(merchandise.price.amount),
                  quantity: node.quantity,
                };
              })
            : [],
        },
      },
      context: {
        language: 'en',
        country: 'US',
        currency: 'USD',
        view: {
          url: `https://sports.barca.group`,
        },
      },
    },
  });

  const [header] = await Promise.all([
    context.storefront.query(HEADER_QUERY, {
      cache: context.storefront.CacheLong(),
      variables: {
        headerMenuHandle: 'hydrogen-menu',
      },
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  return {staticState, cart, header};
}

const favorites = [
  {
    id: 1,
    name: 'Black Basic Tee',
    price: '$32',
    href: '#',
    imageSrc:
      'https://tailwindui.com/plus/img/ecommerce-images/home-page-03-favorite-01.jpg',
    imageAlt: "Model wearing women's black cotton crewneck tee.",
  },
  {
    id: 2,
    name: 'Off-White Basic Tee',
    price: '$32',
    href: '#',
    imageSrc:
      'https://tailwindui.com/plus/img/ecommerce-images/home-page-03-favorite-02.jpg',
    imageAlt: "Model wearing women's off-white cotton crewneck tee.",
  },
  {
    id: 3,
    name: 'Mountains Artwork Tee',
    price: '$36',
    href: '#',
    imageSrc:
      'https://tailwindui.com/plus/img/ecommerce-images/home-page-03-favorite-03.jpg',
    imageAlt:
      "Model wearing women's burgundy red crewneck artwork tee with small white triangle overlapping larger black triangle.",
  },
];

export default function Homepage() {
  const data = useLoaderData<typeof loader>();
  const homepageRecommendations = useHomepageRecommendations();
  useEffect(() => {
    homepageRecommendations.methods?.refresh();
  }, [homepageRecommendations.methods]);

  return (
    <div>
      <Hero />
      <main className="relative overflow-hidden bg-white">
        {/* Category section */}
        <section aria-labelledby="category-heading" className="bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
            <div className="sm:flex sm:items-baseline sm:justify-between">
              <h2
                id="category-heading"
                className="text-2xl font-bold tracking-tight text-gray-900"
              >
                Shop by Category
              </h2>
              <NavLink
                to="/categories"
                className="hidden text-sm font-semibold text-indigo-600 hover:text-indigo-500 sm:block"
              >
                Browse all categories
                <span aria-hidden="true"> &rarr;</span>
              </NavLink>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:grid-rows-2 sm:gap-x-6 lg:gap-8">
              {data.header.collections.edges.map((collection, i) => {
                if (collection.node.title === 'Home page') {
                  return null;
                }
                if (collection.node.title === 'Accessories') {
                  return (
                    <div
                      key={collection.node.id}
                      className="group aspect-h-1 aspect-w-2 overflow-hidden rounded-lg sm:aspect-h-1 sm:aspect-w-1 sm:row-span-2"
                    >
                      <img
                        alt="Two models wearing women's black cotton crewneck tee and off-white cotton crewneck tee."
                        src={collection.node.image?.url}
                        className="object-cover object-center group-hover:opacity-75"
                      />
                      <div
                        aria-hidden="true"
                        className="bg-gradient-to-b from-transparent to-black opacity-50"
                      />
                      <div className="flex items-end p-6">
                        <div>
                          <h3 className="font-semibold text-white">
                            <NavLink
                              to={`/plp/${collection.node.title.toLowerCase()}`}
                            >
                              <span className="absolute inset-0" />
                              {collection.node.title}
                            </NavLink>
                          </h3>
                          <p
                            aria-hidden="true"
                            className="mt-1 text-sm text-white"
                          >
                            Shop now
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div
                    key={collection.node.id}
                    className="group aspect-h-1 aspect-w-2 overflow-hidden rounded-lg sm:aspect-none sm:relative sm:h-full"
                  >
                    <img
                      alt="Wooden shelf with gray and olive drab green baseball caps, next to wooden clothes hanger with sweaters."
                      src={collection.node.image?.url}
                      className="object-cover object-center group-hover:opacity-75 sm:absolute sm:inset-0 sm:size-full"
                    />
                    <div
                      aria-hidden="true"
                      className="bg-gradient-to-b from-transparent to-black opacity-50 sm:absolute sm:inset-0"
                    />
                    <div className="flex items-end p-6 sm:absolute sm:inset-0">
                      <div>
                        <h3 className="font-semibold text-white">
                          <NavLink
                            to={`/plp/${collection.node.title
                              .toLowerCase()
                              .replaceAll('&', '')
                              .replaceAll(' ', '-')
                              .replaceAll('--', '-')}`}
                          >
                            <span className="absolute inset-0" />
                            {collection.node.title}
                          </NavLink>
                        </h3>
                        <p
                          aria-hidden="true"
                          className="mt-1 text-sm text-white"
                        >
                          Shop now
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 sm:hidden">
              <NavLink
                to="#"
                className="block text-sm font-semibold text-indigo-600 hover:text-indigo-500"
              >
                Browse all categories
                <span aria-hidden="true"> &rarr;</span>
              </NavLink>
            </div>
          </div>
        </section>

        {/* Featured section */}
        <section aria-labelledby="cause-heading">
          <div className="relative bg-gray-800 px-6 py-32 sm:px-12 sm:py-40 lg:px-16">
            <div className="absolute inset-0 overflow-hidden">
              <Image
                alt=""
                src="https://images.barca.group/Barca-Sports-Assets/kayak-explained.webp"
                className="size-full object-cover object-center"
              />
            </div>
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gray-900/50"
            />
            <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
              <h2
                id="cause-heading"
                className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
              >
                For every craft
              </h2>
              <p className="mt-3 text-xl text-white">
                Get ready to dive into the world of water sports and make a
                splash! Whether you're into surfing, paddleboarding, kayaking,
                or any other water activity, we've got you covered. Our
                collection of gear and accessories is designed to help you make
                the most of your time on the water.
              </p>
              <NavLink
                to="#"
                className="mt-8 block w-full rounded-md border border-transparent bg-white px-8 py-3 text-base font-medium text-gray-900 hover:bg-gray-100 sm:w-auto"
              >
                Learn more about Barca Technology
              </NavLink>
            </div>
          </div>
        </section>

        {/* Favorites section */}
        <section aria-labelledby="favorites-heading">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
            <div className="sm:flex sm:items-baseline sm:justify-between">
              <h2
                id="favorites-heading"
                className="text-2xl font-bold tracking-tight text-gray-900"
              >
                {homepageRecommendations.state.headline}
              </h2>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-y-10 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-0 lg:gap-x-8">
              {homepageRecommendations.state.products.map((recommendation) => (
                <div
                  key={recommendation.permanentid}
                  className="group relative"
                >
                  <ProductCard product={recommendation} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA section */}
        <section aria-labelledby="sale-heading">
          <div className="overflow-hidden pt-32 sm:pt-14">
            <div className="bg-gray-800">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="relative pb-40 pt-48">
                  <div>
                    <h2
                      id="sale-heading"
                      className="text-4xl font-bold tracking-tight text-white md:text-5xl"
                    >
                      Final Stock.
                      <br />
                      Up to 50% off.
                    </h2>
                    <div className="mt-6 text-base">
                      <NavLink to="#" className="font-semibold text-white">
                        Shop the sale
                        <span aria-hidden="true"> &rarr;</span>
                      </NavLink>
                    </div>
                  </div>

                  <div className="absolute -top-32 left-1/2 -translate-x-1/2 transform sm:top-6 sm:translate-x-0">
                    <div className="ml-24 flex min-w-max space-x-6 sm:ml-3 lg:space-x-8">
                      <div className="flex space-x-6 sm:flex-col sm:space-x-0 sm:space-y-6 lg:space-y-8">
                        <div className="shrink-0">
                          <img
                            alt=""
                            src="https://images.barca.group/Barca-Sports-Assets/mid-adult-man-surfing-rolling-wave-leucadia-cali-2022-03-07-23-55-55-utc.webp"
                            className="size-64 rounded-lg object-cover md:size-72"
                          />
                        </div>

                        <div className="mt-6 shrink-0 sm:mt-0">
                          <img
                            alt=""
                            src="https://images.barca.group/Barca-Sports-Assets/HomepageBannerStatic1.webp"
                            className="size-64 rounded-lg object-cover md:size-72"
                          />
                        </div>
                      </div>
                      <div className="flex space-x-6 sm:-mt-20 sm:flex-col sm:space-x-0 sm:space-y-6 lg:space-y-8">
                        <div className="shrink-0">
                          <img
                            alt=""
                            src="https://images.barca.group/Barca-Sports-Assets/healthy-woman-sitting-on-sup-board-and-rowing-with-2022-06-02-06-58-34-utc.jpg"
                            className="size-64 rounded-lg object-cover md:size-72"
                          />
                        </div>

                        <div className="mt-6 shrink-0 sm:mt-0">
                          <img
                            alt=""
                            src="https://images.barca.group/Barca-Sports-Assets/athletic-woman-wakesurfing-on-the-board-on-lake-2022-11-15-19-02-25-utc%201.png"
                            className="size-64 rounded-lg object-cover md:size-72"
                          />
                        </div>
                      </div>
                      <div className="flex space-x-6 sm:flex-col sm:space-x-0 sm:space-y-6 lg:space-y-8">
                        <div className="shrink-0">
                          <img
                            alt=""
                            src="https://images.barca.group/Barca-Sports-Assets/kayak-explained.png"
                            className="size-64 rounded-lg object-cover md:size-72"
                          />
                        </div>

                        <div className="mt-6 shrink-0 sm:mt-0">
                          <img
                            alt=""
                            src="https://images.barca.group/Barca-Sports-Assets/girl-kayaking-in-a-lake-2022-03-30-01-20-46-utc%201.png"
                            className="size-64 rounded-lg object-cover md:size-72"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
