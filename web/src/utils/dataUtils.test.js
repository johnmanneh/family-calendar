import { emptyForm, mapEventToForm } from './dataUtils';

test('emptyForm defaults hide_cross_family_availability to false', () => {
  expect(emptyForm.hide_cross_family_availability).toBe(false);
});

test('mapEventToForm preserves hide_cross_family_availability when editing', () => {
  const hidden = mapEventToForm({
    title: 'Practice',
    start: '2026-10-21T10:00:00',
    end: '2026-10-21T11:00:00',
    backgroundColor: '#1a8fa8',
    extendedProps: { hide_cross_family_availability: true, is_all_day: false },
  });
  expect(hidden.hide_cross_family_availability).toBe(true);

  const visible = mapEventToForm({
    title: 'Practice',
    start: '2026-10-21T10:00:00',
    hide_cross_family_availability: false,
    extendedProps: {},
  });
  expect(visible.hide_cross_family_availability).toBe(false);
});
