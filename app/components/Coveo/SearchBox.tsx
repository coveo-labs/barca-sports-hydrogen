import type {
  InstantProducts,
  StandaloneSearchBox,
} from '@coveo/headless/commerce';
import {useController} from './Context';

import {defer, useNavigate} from '@remix-run/react';
import {useAside} from '../Aside';

interface CoveoSearchBoxProps {
  searchBox: StandaloneSearchBox;
  instantProducts: InstantProducts;
}
export function CoveoSearchBox({
  searchBox,
  instantProducts,
}: CoveoSearchBoxProps) {
  const {close} = useAside();
  const {suggestions, value, redirectTo} = useController(searchBox);
  const navigate = useNavigate();
  if (redirectTo) {
    setTimeout(() => navigate(`${redirectTo}?q=${value}`), 0);
  }

  return null; /*(
    <Autocomplete
      placeholder="Search"
      value={value}
      onFocus={() => {
        searchBox.showSuggestions();
      }}
      onOptionSubmit={(selectedSuggestion) => {
        instantProducts.updateQuery(selectedSuggestion);
      }}
      onKeyDown={(e) => {
        if (e.code === 'Enter') {
          searchBox.submit();
          close();
        }
      }}
      onChange={(value) => {
        searchBox.updateText(value);
      }}
      data={suggestions.map((suggestion) => suggestion.rawValue)}
    />
  );*/
}
