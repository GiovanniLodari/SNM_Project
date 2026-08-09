import { ReactNode } from "react";
import { motion } from "framer-motion";

interface PageTransitionProps {
  children: ReactNode;
  keyName?: string;
}

/**
 * Wrapper per le transizioni fluide di pagina e delle tab (Framer Motion).
 * Fade-in e leggero scorrimento verticale (-12px -> 0px -> 12px) in perfetto
 * accordo con il tono editoriale controllato di DESIGN.md.
 */
export default function PageTransition({ children, keyName }: PageTransitionProps) {
  return (
    <motion.div
      key={keyName}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      style={{ width: "100%" }}
    >
      {children}
    </motion.div>
  );
}
