import {marked} from 'marked';
import './answer.css';

const toInlinePlainText = (textWithHtml: string): string => {
  const withoutHtmlTags = textWithHtml.replace(/<[^>]*>/g, ' ');
  const withCollapsedWhitespaces = withoutHtmlTags.replace(/\s{2,}/g, ' ');

  return withCollapsedWhitespaces.trim();
};

const unclosedElement = /(\*{1,3}|`)($|\w[\w\s]*$)/;

const completeUnclosedElement = (text: string) => {
  const match = unclosedElement.exec(text);
  if (match) {
    const symbol = match[1];

    const replacements: Record<string, string> = {
      '***':
        '<strong class="answer-strong"><em class="answer-emphasis">$2</em></strong>',
      '**': '<strong class="answer-strong">$2</strong>',
      '*': '<em class="answer-emphasis">$2</em>',
      '`': '<code class="answer-inline-code">$2</code>',
    };

    return text.replace(unclosedElement, replacements[symbol]);
  }

  return text;
};

const escapeHtml = (text: string) => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const customRenderer = {
  blockquote(quote: string) {
    return `<blockquote class="answer-quote-block">${quote}</blockquote>`;
  },

  code(code: string) {
    return `<pre class="answer-code-block"><code>${escapeHtml(
      code,
    )}</code></pre>`;
  },

  codespan(text: string) {
    return `<code class="answer-inline-code">${text}</code>`;
  },

  em(text: string) {
    return `<em class="answer-emphasis">${text}</em>`;
  },

  heading(text: string, level: number) {
    const plainText = toInlinePlainText(text);

    return `<h${level} class="mt-8 text-2xl font-bold tracking-tight text-gray-900" aria-label="${plainText}">${text}</h${level}>`;
  },

  html(text: string) {
    return escapeHtml(text);
  },

  link(href: string, title: string, text: string) {
    return `<a href="${escapeHtml(
      href,
    )}" class="text-indigo-600 underline hover:text-indigo-800 transition-colors duration-200 relative group"${
      title ? ` title="${escapeHtml(title)}"` : ''
    }>${text}</a>`;
  },

  list(body: string, ordered: boolean, start: number | '') {
    const type = ordered ? 'ol' : 'ul';
    const part = 'mt-8 space-y-4';

    const tag =
      ordered && start !== 1
        ? `<${type} class="${part}" start="${start}">`
        : `<${type} class="${part}">`;

    return `${tag}${body}</${type}>`;
  },

  /**
   * Custom Marked renderer to remove wrapping `<p>` element around list item content.
   * @param text The element text content.
   * @returns The list item element to render.
   */
  listitem(text: string) {
    const unwrappedText = text
      .replace(/^<p[^>]*>/, '')
      .replace(/<\/p>\n?$/, '');
    const withClosedElement = completeUnclosedElement(unwrappedText);
    return `<li>${withClosedElement}</li>`;
  },

  paragraph(text: string) {
    return `<p class="text-lg my-4">${text}</p>`;
  },

  strong(text: string) {
    return `<span class="font-semibold text-gray-600" >${text}</span>`;
  },

  /**
   * Custom Marked renderer to wrap `<table>` element in a scrolling container.
   * @param header The table header content.
   * @param body The table body content.
   * @returns The element to render.
   */
  table(header: string, body: string) {
    return `<div class="overflow-hidden shadow ring-1 ring-black/5 sm:rounded-lg my-16"><table class="min-w-full divide-y divide-gray-300"><thead class="bg-gray-50">${header}</thead><tbody class="divide-y divide-gray-200 bg-white">${body}</tbody></table></div>`;
  },

  tablecell(
    content: string,
    flags: {header: boolean; align: 'center' | 'left' | 'right' | null},
  ) {
    const type = flags.header ? 'th' : 'td';
    const part = flags.header
      ? 'py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6'
      : 'whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-500 sm:pl-6';
    const tag = flags.align
      ? `<${type} class="${part}" align="${flags.align}">`
      : `<${type} class="${part}">`;

    return `${tag}${content}</${type}>`;
  },

  /**
   * Custom Marked renderer to complete unclosed inline elements such as bold, italic, and code.
   * @param text The text content.
   * @returns The corrected text content.
   */
  text(text: string) {
    return completeUnclosedElement(text);
  },
};

const transformMarkdownToHtml = (text: string): string => {
  return marked.use({renderer: customRenderer}).parse(text) as string;
};

export function Answer({text}: {text: string}) {
  return (
    <div
      className="text-gray-500"
      dangerouslySetInnerHTML={{__html: transformMarkdownToHtml(text)}}
    ></div>
  );
}
