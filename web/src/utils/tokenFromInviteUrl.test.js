import { tokenFromInviteUrl } from './tokenFromInviteUrl';

test('accepts its4us.app join URLs', () => {
  expect(tokenFromInviteUrl('https://its4us.app/join/Aa-_Token')).toBe('Aa-_Token');
  expect(tokenFromInviteUrl('https://www.its4us.app/join/Aa-_Token')).toBe('Aa-_Token');
});

test('rejects other hosts and non-join paths', () => {
  expect(tokenFromInviteUrl('https://evil.example/join/Aa-_Token')).toBeNull();
  expect(tokenFromInviteUrl('https://its4us.app/e/not-an-invite')).toBeNull();
  expect(tokenFromInviteUrl('javascript:alert(1)')).toBeNull();
  expect(tokenFromInviteUrl('Aa-_Token')).toBeNull();
});
