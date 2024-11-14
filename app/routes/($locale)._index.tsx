import {NavLink, useLoaderData, type MetaFunction} from '@remix-run/react';
import type {LoaderFunctionArgs} from '@remix-run/server-runtime';
import {useEffect} from 'react';
import {RecommendationsList} from '~/components/Coveo/RecommendationsList';
import {
  engineDefinition,
  searchEngineDefinition,
  standaloneEngineDefinition,
  useHomepageRecommendations,
} from '~/lib/coveo.engine';
import {ServerSideNavigatorContextProvider} from '~/lib/navigator.provider';

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

  return {staticState, cart};
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();
  const homepageRecommendations = useHomepageRecommendations();
  useEffect(() => {
    homepageRecommendations.methods?.refresh();
  }, [homepageRecommendations.methods]);

  return (
    <div className="relative overflow-hidden bg-white">
      <div className="pb-80 pt-16 sm:pb-40 sm:pt-24 lg:pb-48 lg:pt-40">
        <div className="relative mx-auto max-w-7xl px-4 sm:static sm:px-6 lg:px-8">
          <div className="sm:max-w-lg">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Ride the wave!
            </h1>
            <p className="mt-4 text-xl text-gray-500">
              Ready to take your surfing game to the next level? Browse our wide
              selection of surfboards, wetsuits, and accessories, all designed
              to help you Ride the Wave with style and ease.
            </p>
          </div>
          <div>
            <div className="mt-10">
              {/* Decorative image grid */}
              <div
                aria-hidden="true"
                className="pointer-events-none lg:absolute lg:inset-y-0 lg:mx-auto lg:w-full lg:max-w-7xl"
              >
                <div className="absolute transform sm:left-1/2 sm:top-0 sm:translate-x-8 lg:left-1/2 lg:top-1/2 lg:-translate-y-1/2 lg:translate-x-8">
                  <div className="flex items-center space-x-6 lg:space-x-8">
                    <div className="grid shrink-0 grid-cols-1 gap-y-6 lg:gap-y-8">
                      <div className="h-64 w-44 overflow-hidden rounded-lg sm:opacity-0 lg:opacity-100">
                        <img
                          alt=""
                          src="https://images.barca.group/Barca-Sports-Assets/bottom-banner-static.webp"
                          className="size-full object-cover object-center"
                        />
                      </div>
                      <div className="h-64 w-44 overflow-hidden rounded-lg">
                        <img
                          alt=""
                          src="https://images.barca.group/Barca-Sports-Assets/athletic-woman-wakesurfing-on-the-board-on-lake-2022-11-15-19-02-25-utc+1.webp"
                          className="size-full object-cover object-center"
                        />
                      </div>
                    </div>
                    <div className="grid shrink-0 grid-cols-1 gap-y-6 lg:gap-y-8">
                      <div className="h-64 w-44 overflow-hidden rounded-lg">
                        <img
                          alt=""
                          src="https://images.barca.group/Barca-Sports-Assets/HomepageBannerStatic1.webp"
                          className="size-full object-cover object-center"
                        />
                      </div>
                      <div className="h-64 w-44 overflow-hidden rounded-lg">
                        <img
                          alt=""
                          src="https://images.barca.group/Barca-Sports-Assets/mid-adult-man-surfing-rolling-wave-leucadia-cali-2022-03-07-23-55-55-utc.jpg"
                          className="size-full object-cover object-center"
                        />
                      </div>
                      <div className="h-64 w-44 overflow-hidden rounded-lg">
                        <img
                          alt=""
                          src="https://images.barca.group/Barca-Sports-Assets/healthy-woman-sitting-on-sup-board-and-rowing-with-2022-06-02-06-58-34-utc.jpg"
                          className="size-full object-cover object-center"
                        />
                      </div>
                    </div>
                    <div className="grid shrink-0 grid-cols-1 gap-y-6 lg:gap-y-8">
                      <div className="h-64 w-44 overflow-hidden rounded-lg">
                        <img
                          alt=""
                          src="https://images.barca.group/Barca-Sports-Assets/heroBannerImage.webp"
                          className="size-full object-cover object-center"
                        />
                      </div>
                      <div className="h-64 w-44 overflow-hidden rounded-lg">
                        <img
                          alt=""
                          src="https://images.barca.group/Barca-Sports-Assets/kayak-explained.webp"
                          className="size-full object-cover object-center"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <NavLink
                to="/collections"
                className="inline-block rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-center font-medium text-white hover:bg-indigo-700"
              >
                Shop Collections
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
