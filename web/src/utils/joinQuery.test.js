import { joinTokenFromSearch, pathWithJoin } from './joinQuery';

test('reads join from the query string', () => {
  expect(joinTokenFromSearch('?join=Aa-_Token')).toBe('Aa-_Token');
  expect(joinTokenFromSearch('')).toBe('');
});

test('keeps the join token on login and dashboard paths', () => {
  expect(pathWithJoin('/dashboard', 'Aa-_Token')).toBe('/dashboard?join=Aa-_Token');
  expect(pathWithJoin('/login', '')).toBe('/login');
});
