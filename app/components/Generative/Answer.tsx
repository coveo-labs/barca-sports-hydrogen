import {marked} from 'marked';
import './answer.css';

// Configure marked to use GitHub Flavored Markdown
marked.setOptions({
  gfm: true,
  breaks: true,
});

// Custom renderer for styled output
const renderer = new marked.Renderer();

renderer.heading = function (text, level) {
  const styles = {
    1: 'text-2xl font-bold',      // 24px bold
    2: 'text-xl font-bold',        // 20px bold
    3: 'text-base font-bold',      // 16px bold
    4: 'text-sm font-semibold',    // 14px semibold
    5: 'text-sm font-semibold',    // 14px semibold
    6: 'text-xs font-semibold',    // 12px semibold
  };
  const style = styles[level as keyof typeof styles] || 'text-base font-bold';
  return `<h${level} class="mt-6 mb-2 ${style} tracking-tight text-gray-900">${text}</h${level}>`;
};

renderer.paragraph = function (text) {
  return `<p class="text-sm my-4">${text}</p>`;
};

renderer.strong = function (text) {
  return `<strong class="font-semibold text-gray-900">${text}</strong>`;
};

renderer.em = function (text) {
  return `<em class="answer-emphasis">${text}</em>`;
};

renderer.codespan = function (code) {
  return `<code class="answer-inline-code">${code}</code>`;
};

renderer.code = function (code) {
  return `<pre class="answer-code-block"><code>${code}</code></pre>`;
};

renderer.blockquote = function (quote) {
  return `<blockquote class="answer-quote-block">${quote}</blockquote>`;
};

renderer.list = function (body, ordered, start) {
  const type = ordered ? 'ol' : 'ul';
  const startAttr = ordered && start !== 1 ? ` start="${start}"` : '';
  const listClass = ordered ? 'list-decimal list-inside' : 'list-disc list-inside';
  return `<${type} class="mt-4 mb-4 space-y-2 ${listClass}"${startAttr}>${body}</${type}>`;
};

renderer.listitem = function (text) {
  // Remove empty list items or items with only whitespace
  const trimmedText = text.trim();
  if (!trimmedText || trimmedText === '<p></p>') {
    return '';
  }
  return `<li class="text-sm">${text}</li>`;
};

renderer.table = function (header, body) {
  return `<div class="overflow-hidden shadow ring-1 ring-black/5 sm:rounded-lg my-6">
    <table class="min-w-full divide-y divide-gray-300">
      <thead class="bg-gray-50">${header}</thead>
      <tbody class="divide-y divide-gray-200 bg-white">${body}</tbody>
    </table>
  </div>`;
};

renderer.tablerow = function (content) {
  return `<tr>${content}</tr>`;
};

renderer.tablecell = function (content, flags) {
  const type = flags.header ? 'th' : 'td';
  const className = flags.header
    ? 'py-3 px-4 text-left text-sm font-semibold text-gray-900'
    : 'py-3 px-4 text-sm text-gray-700';
  const alignClass = flags.align ? ` text-${flags.align}` : '';
  return `<${type} class="${className}${alignClass}">${content}</${type}>`;
};

marked.use({renderer});

export function Answer({text}: {text: string}) {
  const html = marked.parse(text) as string;
  return (
    <div
      className="text-gray-500"
      dangerouslySetInnerHTML={{__html: html}}
    />
  );
}