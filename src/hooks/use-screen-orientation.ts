
import { useState, useEffect } from 'react';

type Orientation = 'portrait' | 'landscape';

export function useScreenOrientation(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>(
    window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape'
  );

  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(
        window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape'
      );
    };

    // Listen for orientation changes
    window.addEventListener('resize', handleOrientationChange);

    // Clean up
    return () => {
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  return orientation;
}
