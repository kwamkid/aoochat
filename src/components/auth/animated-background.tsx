"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

export function AnimatedBackground() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-background to-brand-100 dark:from-background dark:via-brand-950/20 dark:to-background" />
      
      {/* Floating Chat Bubbles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{
            x: Math.random() * window.innerWidth,
            y: window.innerHeight + 100,
          }}
          animate={{
            y: -200,
            x: Math.random() * window.innerWidth,
          }}
          transition={{
            duration: Math.random() * 20 + 20,
            repeat: Infinity,
            ease: "linear",
            delay: i * 3,
          }}
        >
          <div className={`
            ${i % 3 === 0 ? 'bg-brand-200/20' : i % 3 === 1 ? 'bg-brand-300/20' : 'bg-brand-400/20'}
            ${i % 2 === 0 ? 'w-32 h-20' : 'w-40 h-24'}
            rounded-2xl backdrop-blur-sm flex items-center justify-center
            dark:bg-brand-500/10
          `}>
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-brand-400/40 rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-brand-400/40 rounded-full animate-pulse delay-75" />
              <div className="w-2 h-2 bg-brand-400/40 rounded-full animate-pulse delay-150" />
            </div>
          </div>
        </motion.div>
      ))}

      {/* Network Lines */}
      <svg className="absolute inset-0 w-full h-full opacity-10 dark:opacity-5">
        <motion.line
          x1="10%" y1="20%" x2="40%" y2="50%"
          stroke="currentColor" strokeWidth="1"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
        />
        <motion.line
          x1="60%" y1="10%" x2="90%" y2="40%"
          stroke="currentColor" strokeWidth="1"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", delay: 0.5 }}
        />
        <motion.line
          x1="30%" y1="60%" x2="70%" y2="90%"
          stroke="currentColor" strokeWidth="1"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", delay: 1 }}
        />
      </svg>

      {/* Animated Circles */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-64 h-64 bg-brand-200/10 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-300/10 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  )
}