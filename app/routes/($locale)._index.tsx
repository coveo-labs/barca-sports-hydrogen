import {type MetaFunction} from '@remix-run/react';

export const meta: MetaFunction = () => {
  return [{title: 'Hydrogen | Home'}];
};

export default function Homepage() {
  return null;
}
