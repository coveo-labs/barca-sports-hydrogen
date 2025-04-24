import {Input} from '@headlessui/react';
import {useFetcher} from '@remix-run/react';
import {useState} from 'react';
import type {DetectIntentResponse} from '~/routes/detect-intent';

export function OneSearchBox() {
  const intentionFetcher = useFetcher<DetectIntentResponse>();
  const {} = useState(intentionFetcher.data);
  return (
    <Input
      className="search-box w-full h-12 border p-4"
      aria-label="Search"
      placeholder="Search"
      onChange={() => {
        console.log('changed');
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          const formData = new FormData();

          formData.append('input', (e.target as HTMLInputElement).value || '');
          intentionFetcher.submit(formData, {
            method: 'POST',
            action: '/detect-intent',
          });

          // Handle enter key press
        }
      }}
    />
  );
}
