import { motion } from 'framer-motion'

interface PopInProps {
  children: React.ReactNode
  delay?: number
  className?: string
}

/**
 * Pop-in animation: scale 0 → overshoot → rotate → settle
 * Text/content bên trong nghiêng theo vì toàn bộ element được transform
 */
export function PopIn({ children, delay = 0, className }: PopInProps) {
  return (
    <motion.div
      className={className}
      initial={{ scale: 0, opacity: 0, rotate: 0 }}
      animate={{
        scale:   [0,    1.18,  1.05,  1],
        opacity: [0,    1,     1,     1],
        rotate:  [0,    -6,    3,     0],
      }}
      transition={{
        duration: 0.35,
        delay,
        ease: 'easeOut',
        times: [0, 0.45, 0.75, 1],
      }}
    >
      {children}
    </motion.div>
  )
}
