import {Tab, TabGroup, TabList, TabPanel, TabPanels} from '@headlessui/react';
import type {ProductFragment} from 'storefrontapi.generated';

export function ImageGallery({
  product,
  defaultImgIdx,
  onImgSelect,
}: {
  product: ProductFragment;
  defaultImgIdx: number;
  onImgSelect?: (index: number) => void;
}) {
  return (
    <TabGroup
      className="flex flex-col-reverse"
      defaultIndex={defaultImgIdx}
      selectedIndex={defaultImgIdx}
      onChange={onImgSelect}
    >
      {/* Image selector */}
      <div className="mx-auto mt-6 hidden w-full max-w-2xl sm:block lg:max-w-none">
        <TabList className="grid grid-cols-4 gap-6">
          {product.images.nodes.map((imageInfo) => (
            <Tab
              key={imageInfo.id}
              className="group relative flex h-24 cursor-pointer items-center justify-center rounded-md bg-white text-sm font-medium uppercase text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring focus:ring-indigo-500/50 focus:ring-offset-4"
            >
              <span className="sr-only">{imageInfo.altText}</span>
              <span className="absolute inset-0 overflow-hidden rounded-md">
                <img
                  alt={imageInfo.altText || ''}
                  src={imageInfo.url}
                  width={imageInfo.width || 50}
                  height={imageInfo.height || 50}
                  className="size-full object-cover object-center"
                />
              </span>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-transparent ring-offset-2 group-data-[selected]:ring-indigo-500"
              />
            </Tab>
          ))}
        </TabList>
      </div>

      <TabPanels className="aspect-h-1 aspect-w-1 w-full">
        {product.images.nodes.map((imageInfo) => (
          <TabPanel key={imageInfo.id}>
            <img
              alt={imageInfo.altText || ''}
              src={imageInfo.url}
              className="size-full object-cover object-center sm:rounded-lg"
            />
          </TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  );
}
