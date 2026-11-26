import { motion } from "motion/react";
import type { ReactNode } from "react";
import { fadeUp } from "./motion-presets";

type Props = { id?: string; role?: "alert"; children: ReactNode };

export function FormError({ id, role, children }: Props) {
  return (
    <motion.p {...fadeUp} id={id} role={role} className="text-sm text-red-600">
      {children}
    </motion.p>
  );
}
