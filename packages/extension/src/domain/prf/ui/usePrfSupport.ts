import { useEffect, useState } from 'react';

import { detectPrfSupport, type PrfSupportResult } from '../detect';

type PrfSupportState = {
  isChecking: boolean;
  isSupported: boolean;
  reason?: PrfSupportResult['reason'];
};

export function usePrfSupport() {
  const [state, setState] = useState<PrfSupportState>({
    isChecking: true,
    isSupported: false,
    reason: undefined,
  });

  useEffect(() => {
    detectPrfSupport().then((result) => {
      setState({
        isChecking: false,
        isSupported: result.supported,
        reason: result.reason,
      });
    });
  }, []);

  return state;
}
