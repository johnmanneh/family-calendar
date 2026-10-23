import { runJoinFlow } from './joinFlow';
import API from '../api/axios';

jest.mock('../api/axios', () => ({ get: jest.fn() }));

beforeEach(() => {
  API.get.mockReset();
  window.confirm = jest.fn();
});

test('confirms family name from public preview before joining', async () => {
  API.get.mockResolvedValue({ data: { type: 'family', family: { name: 'Family Manneh' } } });
  window.confirm.mockReturnValue(true);
  const joinWithCode = jest.fn().mockResolvedValue({ type: 'family', family: { name: 'Family Manneh' } });
  const fetchFamily = jest.fn();
  await runJoinFlow('Aa-_Token', joinWithCode, fetchFamily);
  expect(API.get).toHaveBeenCalledWith('/public/join/Aa-_Token');
  expect(window.confirm).toHaveBeenCalledWith('Join Family Manneh?');
  expect(joinWithCode).toHaveBeenCalledWith('Aa-_Token', false);
  expect(fetchFamily).toHaveBeenCalled();
});

test('does not join when the name confirm is cancelled', async () => {
  API.get.mockResolvedValue({ data: { type: 'family', family: { name: 'Family Manneh' } } });
  window.confirm.mockReturnValue(false);
  const joinWithCode = jest.fn();
  const fetchFamily = jest.fn();
  const result = await runJoinFlow('Aa-_Token', joinWithCode, fetchFamily);
  expect(result).toBeNull();
  expect(joinWithCode).not.toHaveBeenCalled();
});

test('does not uppercase the code', async () => {
  API.get.mockRejectedValue({ response: { status: 404 } });
  const joinWithCode = jest.fn().mockResolvedValue({ type: 'group', group: { name: 'Bros' } });
  await runJoinFlow('Aa-_Token', joinWithCode, jest.fn());
  expect(joinWithCode).toHaveBeenCalledWith('Aa-_Token', false);
});
