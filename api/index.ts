import handler from '../server';

export default handler;

// Use Node.js runtime instead of Edge for better compatibility
export const config = {
  runtime: 'nodejs',
};
