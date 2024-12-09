import {Switch} from '@headlessui/react';
import {Form, NavLink, useFetcher, useLoaderData} from '@remix-run/react';
import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  json,
} from '@shopify/remix-oxygen';
import {GET_CUSTOMER_QUERY} from '~/lib/fragments';

const SET_METAFIELDS_MUTATION = `
  mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        key
        namespace
        value
        createdAt
        updatedAt
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export async function loader({context}: LoaderFunctionArgs) {
  const {data, errors} = await context.customerAccount.query<{
    customer: {
      firstName?: string;
      lastName?: string;
      displayName?: string;
      emailAddress: {emailAddress: string};
      imageUrl?: string;
      id: string;
      defaultAddress?: {
        address1: string;
        address2: string;
        city: string;
        company: string;
        country: string;
        formatted: string;
        province: string;
        zip: string;
      };
      metafields?: {key?: string; value?: string}[];
    };
  }>(GET_CUSTOMER_QUERY);

  if (errors?.length || !data?.customer) {
    throw new Error('Customer not found');
  }

  return json(
    {customer: data.customer},
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Set-Cookie': await context.session.commit(),
      },
    },
  );
}

export async function action({request, context}: ActionFunctionArgs) {
  const formData = await request.formData();
  const interests: string[] = [];

  formData.forEach((formValue, formEntry) => {
    if (formValue === 'interest') {
      interests.push(formEntry);
    }
  });

  return await context.customerAccount.mutate(SET_METAFIELDS_MUTATION, {
    variables: {
      metafields: [
        {
          namespace: 'custom',
          key: 'notes',
          value: formData.get('about'),
          type: 'multi_line_text_field',
          ownerId: formData.get('customerId'),
        },
        {
          namespace: 'custom',
          key: 'interests',
          value: JSON.stringify(interests),
          type: 'json',
          ownerId: formData.get('customerId'),
        },
      ],
    },
  });
}

export default function () {
  const {customer} = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const customerInterests = customer.metafields
    ? JSON.parse(
        customer.metafields.find((m) => m?.key === 'interests')?.value || '[]',
      )
    : [];

  const customerNotes = customer.metafields
    ? customer.metafields?.find((m) => m?.key === 'notes')?.value
    : '';
  return customer ? (
    <main className="space-y-10 divide-y divide-gray-900/10 mx-auto max-w-2xl px-4 pb-24 pt-16 sm:px-6 lg:max-w-7xl lg:px-8">
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 pt-10 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <h2 className="text-base/7 font-semibold text-gray-900">
            Personal Information
          </h2>
        </div>

        <div className="shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
          <div className="px-4 py-6 sm:p-8">
            <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <PersonalInformation
                  id="first-name"
                  label="First name"
                  value={customer.firstName}
                />
              </div>

              <div className="sm:col-span-3">
                <PersonalInformation
                  id="last-name"
                  label="Last name"
                  value={customer.lastName}
                />
              </div>
              <div className="sm:col-span-4">
                <PersonalInformation
                  id="email"
                  label="Email address"
                  value={customer.emailAddress.emailAddress}
                />
              </div>

              <div className="col-span-full">
                <PersonalInformation
                  id="street-address"
                  label="Street address"
                  value={customer.defaultAddress?.address1}
                />
              </div>

              <div className="sm:col-span-2 sm:col-start-1">
                <PersonalInformation
                  id="city"
                  label="City"
                  value={customer.defaultAddress?.city}
                />
              </div>

              <div className="sm:col-span-2">
                <PersonalInformation
                  id="region"
                  label="State / Province"
                  value={customer.defaultAddress?.province}
                />
              </div>

              <div className="sm:col-span-2">
                <PersonalInformation
                  id="country"
                  label="Country"
                  value={customer.defaultAddress?.country}
                />
              </div>

              <div className="sm:col-span-2">
                <PersonalInformation
                  id="postal-code"
                  label="ZIP / Postal code"
                  value={customer.defaultAddress?.zip}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-x-6 border-t border-gray-900/10 px-4 py-4 sm:px-8">
            <NavLink
              to="https://shopify.com/91065024786/account"
              type="submit"
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Manage my Shopify account
            </NavLink>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3 pt-10">
        <div className="px-4 sm:px-0">
          <h2 className="text-base/7 font-semibold text-gray-900">Profile</h2>
          <p className="mt-1 text-sm/6 text-gray-600">
            Tell us a little about yourself.
          </p>
        </div>

        <fetcher.Form
          className="shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2"
          method="POST"
        >
          <input type="hidden" name="customerId" value={customer.id}></input>
          <div className="px-4 py-6 sm:p-8">
            <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="col-span-full">
                <label
                  htmlFor="about"
                  className="block text-sm/6 font-medium text-gray-900"
                >
                  Write a few sentences about yourself.
                </label>
                <div className="mt-2">
                  <textarea
                    id="about"
                    name="about"
                    rows={3}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm/6"
                    defaultValue={customerNotes}
                  />
                </div>
              </div>
              <div className="col-span-full">
                <label
                  htmlFor="preferences"
                  className="block text-sm/6 font-medium text-gray-900"
                >
                  What are you interested in ?
                </label>
                <div className="mt-4 grid grid-cols-2">
                  <Interest
                    label="Hiking"
                    id="hiking"
                    interests={customerInterests}
                  />
                  <Interest
                    label="Kayaking"
                    id="kayaking"
                    interests={customerInterests}
                  />
                  <Interest
                    label="Surfing"
                    id="surfing"
                    interests={customerInterests}
                  />
                  <Interest
                    label="Beach sportswear"
                    id="beach_sportswear"
                    interests={customerInterests}
                  />
                  <Interest
                    label="Seasonal themes"
                    id="seasonal_themes"
                    interests={customerInterests}
                  />
                  <Interest
                    label="Travel"
                    id="travel"
                    interests={customerInterests}
                  />
                  <Interest
                    label="Eco-Friendly products"
                    id="eco_friendly"
                    interests={customerInterests}
                  />
                  <Interest
                    label="Sales & Offers"
                    id="sales_offers"
                    interests={customerInterests}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-x-6 border-t border-gray-900/10 px-4 py-4 sm:px-8">
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Save
            </button>
          </div>
        </fetcher.Form>
      </div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3 pt-10">
        <div className="px-4 sm:px-0">
          <h2 className="text-base/7 font-semibold text-gray-900">Logout</h2>
          <p className="mt-1 text-sm/6 text-gray-600">
            Logout from your Shopify account
          </p>
        </div>
        <Form className="md:col-span-2" action="/account/logout" method="POST">
          <div className="flex items-center justify-end gap-x-6 py-4">
            <button
              type="submit"
              className="rounded-md bg-red-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-400"
            >
              Log out
            </button>
          </div>
        </Form>
      </div>
    </main>
  ) : null;
}

function PersonalInformation({
  value,
  label,
  id,
}: {
  value?: string;
  label: string;
  id: string;
}) {
  return (
    <>
      <label
        htmlFor="first-name"
        className="block text-sm/6 font-medium text-gray-900"
      >
        {label}
      </label>
      <div className="mt-2">
        <div
          id={id}
          className="block w-full rounded-md border-0 p-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm/6"
        >
          {value}
        </div>
      </div>
    </>
  );
}

function Interest({
  label,
  id,
  interests,
}: {
  label: string;
  id: string;
  interests: string[];
}) {
  return (
    <div className="flex p-4">
      <label htmlFor={id} className="pr-6 text-gray-900 sm:w-64 cursor-pointer">
        {label}
      </label>
      <Switch
        defaultChecked={interests?.includes(id)}
        name={id}
        id={id}
        value="interest"
        className="mt-2 group flex w-8 cursor-pointer rounded-full bg-gray-200 p-px ring-1 ring-inset ring-gray-900/5 transition-colors duration-200 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 data-[checked]:bg-indigo-600"
      >
        <span
          aria-hidden="true"
          className="size-4 transform rounded-full bg-white shadow-sm ring-1 ring-gray-900/5 transition duration-200 ease-in-out group-data-[checked]:translate-x-3.5"
        />
      </Switch>
    </div>
  );
}
