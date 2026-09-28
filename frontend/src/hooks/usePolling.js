import { useEffect, useRef } from "react";

export default function usePolling(callback, interval, key) {
  const saved = useRef(callback);

  useEffect(() => {
    saved.current = callback;
  });

  useEffect(() => {
    saved.current();
    const timer = setInterval(() => saved.current(), interval);
    return () => clearInterval(timer);
  }, [interval, key]);
}
