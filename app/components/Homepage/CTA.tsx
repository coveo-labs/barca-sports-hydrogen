import {NavLink} from '@remix-run/react';

export function CTA() {
  return (
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
                <div className="ml-24 flex min-w-max fspace-x-6 sm:ml-3 lg:space-x-8">
                  <div className="flex space-x-6 sm:flex-col sm:space-x-0 sm:space-y-6 lg:space-y-8">
                    <div className="shrink-0">
                      <img
                        width={288}
                        height={288}
                        loading="lazy"
                        alt=""
                        src="https://images.barca.group/Barca-Sports-Assets/mid-adult-man-surfing-rolling-wave-leucadia-cali-2022-03-07-23-55-55-utc.webp"
                        className="size-64 rounded-lg object-cover md:size-72"
                      />
                    </div>

                    <div className="mt-6 shrink-0 sm:mt-0">
                      <img
                        width={288}
                        height={288}
                        loading="lazy"
                        alt=""
                        src="https://images.barca.group/Barca-Sports-Assets/HomepageBannerStatic1.webp"
                        className="size-64 rounded-lg object-cover md:size-72"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-6 sm:-mt-20 sm:flex-col sm:space-x-0 sm:space-y-6 lg:space-y-8">
                    <div className="shrink-0">
                      <img
                        width={288}
                        height={288}
                        loading="lazy"
                        alt=""
                        src="https://images.barca.group/Barca-Sports-Assets/healthy-woman-sitting-on-sup-board-and-rowing-with-2022-06-02-06-58-34-utc.jpg"
                        className="size-64 rounded-lg object-cover md:size-72"
                      />
                    </div>

                    <div className="mt-6 shrink-0 sm:mt-0">
                      <img
                        width={288}
                        height={288}
                        loading="lazy"
                        alt=""
                        src="https://images.barca.group/Barca-Sports-Assets/athletic-woman-wakesurfing-on-the-board-on-lake-2022-11-15-19-02-25-utc%201.png"
                        className="size-64 rounded-lg object-cover md:size-72"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-6 sm:flex-col sm:space-x-0 sm:space-y-6 lg:space-y-8">
                    <div className="shrink-0">
                      <img
                        width={288}
                        height={288}
                        loading="lazy"
                        alt=""
                        src="https://images.barca.group/Barca-Sports-Assets/kayak-explained.png"
                        className="size-64 rounded-lg object-cover md:size-72"
                      />
                    </div>

                    <div className="mt-6 shrink-0 sm:mt-0">
                      <img
                        width={288}
                        height={288}
                        loading="lazy"
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
  );
}
