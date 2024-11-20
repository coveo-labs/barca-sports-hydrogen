import {NavLink} from '@remix-run/react';

export function LearnMore() {
  return (
    <section aria-labelledby="cause-heading">
      <div className="relative bg-gray-800 px-6 py-32 sm:px-12 sm:py-40 lg:px-16">
        <div className="absolute inset-0 overflow-hidden">
          <img
            alt=""
            src="https://images.barca.group/Barca-Sports-Assets/kayak-explained.webp"
            className="size-full object-cover object-center"
          />
        </div>
        <div aria-hidden="true" className="absolute inset-0 bg-gray-900/50" />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
          <h2
            id="cause-heading"
            className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            For every craft
          </h2>
          <p className="mt-3 text-xl text-white">
            Get ready to dive into the world of water sports and make a splash!
            Whether you&apos;re into surfing, paddleboarding, kayaking, or any
            other water activity, we&apos;ve got you covered. Our collection of
            gear and accessories is designed to help you make the most of your
            time on the water.
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
  );
}
