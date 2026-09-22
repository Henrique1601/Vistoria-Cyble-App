import { useState, useRef, useCallback } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 150,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartY = useRef(0);
  const pullDistanceRef = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      pullStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (pullStartY.current === 0) return;
      const diff = e.touches[0].clientY - pullStartY.current;
      if (diff > 0 && diff < maxPull) {
        pullDistanceRef.current = diff;
        setPullDistance(diff);
      }
    },
    [maxPull]
  );

  const handleTouchEnd = useCallback(async () => {
    if (pullDistanceRef.current > threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    pullDistanceRef.current = 0;
    setPullDistance(0);
    pullStartY.current = 0;
  }, [threshold, onRefresh]);

  return {
    pullDistance,
    isRefreshing,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
