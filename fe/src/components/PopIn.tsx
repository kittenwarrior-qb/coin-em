import { motion } from 'framer-motion'

interface PopInProps {
  children: React.ReactNode
  delay?: number
  className?: string
}

// Soft pop — gentle scale-up with a faint settle, no squash/stretch wobble
//  t=0:    slightly shrunk (scale 0.92)
//  t=0.7:  settle (scale 1.02)
//  t=1:    rest (scale 1)
export function PopIn({ children, delay = 0, className }: PopInProps) {
  return (
    <motion.div
      className={className}
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{
        scale:   [0.92, 1.02, 1],
        opacity: [0,    1,    1],
      }}
      transition={{
        duration: 0.32,
        delay,
        ease: 'easeOut',
        times: [0, 0.7, 1],
      }}
      style={{ transformOrigin: 'center' }}
    >
      {children}
    </motion.div>
  )
}
