import { useEffect, useState } from "react";
import { animate, useMotionValue } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Componente per il contatore numerico animato con Framer Motion.
 * Incrementa/decrementa in modo fluido il valore numerico da 0 al valore target.
 */
export function AnimatedCounter({
  value,
  duration = 1.2,
  decimals = 0,
  prefix = "",
  suffix = "",
}: AnimatedCounterProps) {
  const count = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(
    prefix + (0).toLocaleString("it-IT", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix
  );

  useEffect(() => {
    const controls = animate(count, value, {
      duration,
      ease: [0.16, 1, 0.3, 1], // Custom cubic-bezier for smooth deceleration
      onUpdate: (latest) => {
        const formatted =
          prefix +
          latest.toLocaleString("it-IT", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }) +
          suffix;
        setDisplayValue(formatted);
      },
    });

    return () => controls.stop();
  }, [value, duration, decimals, prefix, suffix, count]);

  return <span>{displayValue}</span>;
}
