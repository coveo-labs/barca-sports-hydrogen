import type {Config} from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';
import aspectRatio from '@tailwindcss/aspect-ratio';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

export default {
  content: ['./html', './app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['InterVariable', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [aspectRatio, forms, typography],
  safelist: [
    {
      pattern: /bg-/,
    },
    {
      pattern: /ring-/,
    },
    {
      pattern: /col-span-/,
    },
  ],
} satisfies Config;
