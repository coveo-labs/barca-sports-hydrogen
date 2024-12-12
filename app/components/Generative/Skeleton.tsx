import {useEffect, useState} from 'react';
import cx from '~/lib/cx';

export function Skeleton({numLines, tick}: {numLines: number; tick: number}) {
  const [timeLeft, setTimeLeft] = useState(4);

  useEffect(() => {
    if (timeLeft === 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, tick);

    return () => clearInterval(timer);
  }, [timeLeft, tick]);

  return (
    <div className="h-2 animate-pulse">
      {Array.from({length: numLines}, (_, i) => i).map((_, i) => (
        <div
          key={i}
          className={cx(
            'mt-2 h-full bg-gradient-to-r from-gray-50 to-gray-400 transition-all duration-500 ease-in-out rounded w-0 pulse',
          )}
          style={{
            width: `${(4 - timeLeft) * 25 - 100 + (100 - i * numLines)}%`,
          }}
        />
      ))}
    </div>
  );
}
