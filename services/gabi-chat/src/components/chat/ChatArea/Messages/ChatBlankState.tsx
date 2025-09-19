'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import React from 'react'

const EXTERNAL_LINKS = {
  documentation: 'https://gabi.ness.tec.br/docs',
  gabiOS: 'https://os.gabi.ness.tec.br',
  ness: 'https://ness.tec.br'
}

// Removido TECH_ICONS - não precisamos mais dos logos das soluções

interface ActionButtonProps {
  href: string
  variant?: 'primary'
  text: string
}

const ActionButton = ({ href, variant, text }: ActionButtonProps) => {
  const baseStyles =
    'px-6 py-3 text-sm transition-all duration-200 font-montserrat tracking-tight rounded-xl'
  const variantStyles = {
    primary: 'border border-border bg-secondary/50 hover:bg-secondary text-white hover:text-white'
  }

  return (
    <Link
      href={href}
      target="_blank"
      className={`${baseStyles} ${variant ? variantStyles[variant] : 'text-white border border-border/30 bg-secondary/30 hover:bg-secondary/50 hover:text-white'}`}
    >
      {text}
    </Link>
  )
}

const ChatBlankState = () => {

  return (
    <section
      className="flex flex-col items-center text-center font-montserrat"
      aria-label="Welcome message"
    >
      <div className="flex max-w-3xl flex-col gap-y-8">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-4xl font-medium tracking-tight"
        >
          <div className="flex items-center justify-center gap-x-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-lg font-medium text-background shadow-lg">
              G
            </div>
            <span className="text-4xl font-medium text-white">
              Gabi<span className="text-brand">.</span>
            </span>
          </div>
          <p className="text-xl font-normal text-primary/80 mt-4">
            powered by ness<span className="text-brand">.</span>
          </p>
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex justify-center gap-4"
        >
          <ActionButton
            href={EXTERNAL_LINKS.documentation}
            variant="primary"
            text="Documentação"
          />
          <ActionButton href={EXTERNAL_LINKS.gabiOS} text="Gabi OS" />
        </motion.div>
      </div>
    </section>
  )
}

export default ChatBlankState
