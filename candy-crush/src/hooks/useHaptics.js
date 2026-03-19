import { useCallback } from 'react';

const vibrate = (pattern) => {
  try { navigator?.vibrate?.(pattern); } catch {}
};

export function useHaptics() {
  const hapticLight   = useCallback(() => vibrate(10), []);
  const hapticMatch   = useCallback(() => vibrate([12, 8, 12]), []);
  const hapticSuccess = useCallback(() => vibrate([20, 10, 30, 10, 60]), []);
  const hapticFail    = useCallback(() => vibrate([60, 40, 100]), []);
  const hapticPowerUp = useCallback(() => vibrate([10, 5, 20, 5, 40]), []);

  return { hapticLight, hapticMatch, hapticSuccess, hapticFail, hapticPowerUp };
}
