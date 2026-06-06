import { motion } from 'framer-motion'

interface PopInProps {
  children: React.ReactNode
  delay?: number
  className?: string
}

// Squash & stretch pop:
//  t=0:    tiny seed (scaleX 0.2, scaleY 0.2)
//  t=0.38: lands wide — squash flat (scaleX 1.16, scaleY 0.82) + slight rotation
//  t=0.62: bounces up — stretch tall (scaleX 0.93, scaleY 1.10)
//  t=0.80: slight over-correct (scaleX 1.03, scaleY 0.97)
//  t=1:    settle
export function PopIn({ children, delay = 0, className }: PopInProps) {
  return (
    <motion.div
      className={className}
      initial={{ scaleX: 0.15, scaleY: 0.15, opacity: 0, rotate: 0 }}
      animate={{
        scaleX:  [0.15, 1.16,  0.93,  1.03,  1],
        scaleY:  [0.15, 0.82,  1.10,  0.97,  1],
        opacity: [0,    1,     1,     1,     1],
        rotate:  [0,    -5,    2,     -1,    0],
      }}
      transition={{
        duration: 0.42,
        delay,
        ease: 'easeOut',
        times: [0, 0.38, 0.62, 0.80, 1],
      }}
      style={{ transformOrigin: 'center' }}
    >
      {children}
    </motion.div>
  )
}
