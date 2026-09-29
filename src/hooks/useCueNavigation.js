import { useEffect, useState } from 'react';

export function useCueNavigation(totalCues) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex((index) =>
      Math.max(0, Math.min(index, totalCues - 1))
    );
  }, [totalCues]);

  function goNext() {
    setActiveIndex((index) =>
      Math.min(index + 1, totalCues - 1)
    );
  }

  function goPrevious() {
    setActiveIndex((index) =>
      Math.max(index - 1, 0)
    );
  }

  function resetNavigation() {
    setActiveIndex(0);
  }

  return {
    activeIndex,
    setActiveIndex,
    goNext,
    goPrevious,
    resetNavigation,
  };
}