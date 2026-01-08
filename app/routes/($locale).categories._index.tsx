import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from 'react-router';

import {Link} from 'react-router';
import {getLocaleFromRequest} from '~/lib/i18n';
import {updateTokenIfNeeded} from '~/lib/auth/token-utils.server';
import {engineConfig, engineDefinition} from '~/lib/coveo/engine';
import {ServerSideNavigatorContextProvider} from '~/lib/coveo/navigator.provider';

interface CategoryValue {
  value: string;
  numberOfResults: number;
  path: string[];
}

interface CategoryTree {
  name: string;
  fullPath: string[];
  numberOfResults: number;
  children: Map<string, CategoryTree>;
}

export const meta: MetaFunction<typeof loader> = () => {
  return [{title: `Shop by Category | Barca Sports`}];
};

function buildCategoryTree(categories: CategoryValue[]): CategoryTree {
  const root: CategoryTree = {
    name: '',
    fullPath: [],
    numberOfResults: 0,
    children: new Map(),
  };

  for (const category of categories) {
    let currentLevel = root;

    for (let i = 0; i < category.path.length; i++) {
      const segment = category.path[i];
      const fullPath = category.path.slice(0, i + 1);

      if (!currentLevel.children.has(segment)) {
        currentLevel.children.set(segment, {
          name: segment,
          fullPath: fullPath,
          numberOfResults: 0,
          children: new Map(),
        });
      }

      const node = currentLevel.children.get(segment)!;

      // If this is the final segment, set the product count
      if (i === category.path.length - 1) {
        node.numberOfResults = category.numberOfResults;
      }

      currentLevel = node;
    }
  }

  return root;
}

export async function loader({request}: LoaderFunctionArgs) {
  getLocaleFromRequest(request);

  // Update token if needed, same as search.tsx
  await updateTokenIfNeeded('searchEngineDefinition', request);
  const accessToken = engineDefinition.searchEngineDefinition.getAccessToken();
  const navigatorContext = new ServerSideNavigatorContextProvider(request);

  const organizationId = engineConfig.configuration.organizationId;

  // Call Coveo Search API v3 values endpoint
  const response = await fetch(
    `https://platform.cloud.coveo.com/rest/search/v3/values?organizationId=${organizationId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        field: 'ec_category',
        constantQueryOverride:
          '@source=="shopify united_states barca_sports en usd - 13785e9e-c1f3-4d72-b2c8-2881888a1597"',
        maximumNumberOfValues: 1000,
        locale: `${engineConfig.configuration.context.language}-${engineConfig.configuration.context.country}`,
        analytics: {
          clientId: navigatorContext.clientId,
          trackingId: engineConfig.configuration.analytics.trackingId,
        },
      }),
    },
  );

  if (!response.ok) {
    console.error(
      '[loader] Values API error:',
      response.status,
      response.statusText,
      await response.text(),
    );
    throw new Error(`Values API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    values?: Array<{value: string; numberOfResults: number}>;
  };
  const categories: CategoryValue[] = (data.values || []).map((item) => ({
    value: item.value,
    numberOfResults: item.numberOfResults,
    path: item.value.split('|').map((part: string) => part.trim()),
  }));

  // Build hierarchical tree
  const tree = buildCategoryTree(categories);

  return {categories, tree};
}

export default function CategoriesIndex() {
  const {tree} = useLoaderData<typeof loader>();

  if (!tree || tree.children.size === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-4">
            Shop by Category
          </h1>
          <p className="text-gray-600">No categories available at this time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-extrabold tracking-tight mb-4 drop-shadow-md">
              Shop by Category
            </h1>
            <p className="text-xl text-white max-w-2xl mx-auto">
              Discover everything you need for your water sports adventures
            </p>
          </div>
        </div>
      </div>

      {/* Categories Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-12">
          {Array.from(tree.children.entries()).map(([name, node]) => (
            <CategorySection key={name} node={node} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CategorySection({node}: {node: CategoryTree}) {
  const hasChildren = node.children.size > 0;
  const categorySlug = node.fullPath
    .join('/')
    .toLowerCase()
    .replace(/[^a-z0-9\s\-/]+/g, '')
    .replace(/\s+/g, '-');
  const plpUrl = `/plp/${categorySlug}`;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{node.name}</h2>
        {node.numberOfResults > 0 && (
          <Link
            to={plpUrl}
            className="group inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            View all {node.numberOfResults.toLocaleString()}
            <svg
              className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        )}
      </div>

      {/* Section Content */}
      {hasChildren && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          {Array.from(node.children.entries()).map(([name, childNode]) => (
            <CategoryItem key={name} node={childNode} level={1} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryItem({node, level}: {node: CategoryTree; level: number}) {
  const hasChildren = node.children.size > 0;
  const categorySlug = node.fullPath
    .join('/')
    .toLowerCase()
    .replace(/[^a-z0-9\s\-/]+/g, '')
    .replace(/\s+/g, '-');
  const plpUrl = `/plp/${categorySlug}`;

  // Calculate indentation based on level
  const indentClass = level === 1 ? '' : level === 2 ? 'ml-6' : 'ml-12';

  // Font sizing based on level
  const headingClass =
    level === 1 ? 'text-lg font-semibold' : 'text-base font-medium';
  const linkClass = 'text-sm';

  if (hasChildren) {
    // Parent category with children
    return (
      <div className={indentClass}>
        <Link
          to={plpUrl}
          className="group flex items-center justify-between py-2 hover:text-blue-600 transition-colors"
        >
          <span
            className={`${headingClass} text-gray-900 group-hover:text-blue-600`}
          >
            {node.name}
          </span>
          {node.numberOfResults > 0 && (
            <span className="text-sm text-gray-500 group-hover:text-blue-600">
              {node.numberOfResults.toLocaleString()}
            </span>
          )}
        </Link>
        <div className="mt-2 space-y-2">
          {Array.from(node.children.entries()).map(([name, childNode]) => (
            <CategoryItem key={name} node={childNode} level={level + 1} />
          ))}
        </div>
      </div>
    );
  }

  // Leaf category - simple link
  return (
    <Link
      to={plpUrl}
      className={`${indentClass} group flex items-center justify-between py-1.5 hover:text-blue-600 transition-colors`}
    >
      <span className={`${linkClass} text-gray-700 group-hover:text-blue-600`}>
        {node.name}
      </span>
      {node.numberOfResults > 0 && (
        <span className="text-sm text-gray-500 group-hover:text-blue-600">
          {node.numberOfResults.toLocaleString()}
        </span>
      )}
    </Link>
  );
}
