// src/hooks/use-conversation-scroll.ts

import { RefObject, useCallback, useEffect, useRef } from 'react'

/**
 * Options for conversation scroll management
 */
export interface ConversationScrollOptions {
  autoScrollToBottom?: boolean
  scrollThreshold?: number
  smoothScroll?: boolean
}

/**
 * Conversation scroll manager class
 */
export class ConversationScrollManager {
  private container: HTMLElement | null = null
  private isUserScrolling = false
  private lastScrollTop = 0
  private options: ConversationScrollOptions
  
  constructor(options: ConversationScrollOptions = {}) {
    this.options = {
      autoScrollToBottom: true,
      scrollThreshold: 100,
      smoothScroll: true,
      ...options
    }
  }
  
  /**
   * Set container element
   */
  setContainer(element: HTMLElement | null) {
    this.container = element
  }
  
  /**
   * Scroll to bottom of container
   */
  scrollToBottom(force = false) {
    if (!this.container) return
    
    // Don't scroll if user is scrolling up (unless forced)
    if (!force && this.isUserScrolling) return
    
    const behavior = this.options.smoothScroll ? 'smooth' : 'auto'
    
    // Use requestAnimationFrame for better performance
    requestAnimationFrame(() => {
      if (!this.container) return
      
      this.container.scrollTo({
        top: this.container.scrollHeight,
        behavior: behavior as ScrollBehavior
      })
    })
  }
  
  /**
   * Scroll to specific message
   */
  scrollToMessage(messageId: string) {
    if (!this.container) return
    
    const messageElement = this.container.querySelector(`[data-message-id="${messageId}"]`)
    if (!messageElement) return
    
    messageElement.scrollIntoView({
      behavior: this.options.smoothScroll ? 'smooth' : 'auto',
      block: 'center'
    })
    
    // Add highlight effect
    messageElement.classList.add('highlight')
    setTimeout(() => {
      messageElement.classList.remove('highlight')
    }, 2000)
  }
  
  /**
   * Check if user is near bottom
   */
  isNearBottom(): boolean {
    if (!this.container) return true
    
    const { scrollTop, scrollHeight, clientHeight } = this.container
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    
    return distanceFromBottom < (this.options.scrollThreshold || 100)
  }
  
  /**
   * Handle scroll event
   */
  handleScroll() {
    if (!this.container) return
    
    const { scrollTop } = this.container
    const isScrollingUp = scrollTop < this.lastScrollTop
    
    // Update user scrolling state
    this.isUserScrolling = isScrollingUp && !this.isNearBottom()
    this.lastScrollTop = scrollTop
  }
  
  /**
   * Maintain scroll position when loading older messages
   */
  maintainScrollPosition(callback: () => void | Promise<void>) {
    if (!this.container) {
      callback()
      return
    }
    
    const previousScrollHeight = this.container.scrollHeight
    const previousScrollTop = this.container.scrollTop
    
    // Execute callback
    const result = callback()
    
    // Handle async callback
    if (result instanceof Promise) {
      result.then(() => {
        if (!this.container) return
        
        // Calculate new scroll position
        const newScrollHeight = this.container.scrollHeight
        const scrollDiff = newScrollHeight - previousScrollHeight
        
        // Maintain position
        this.container.scrollTop = previousScrollTop + scrollDiff
      })
    } else {
      // Sync callback
      requestAnimationFrame(() => {
        if (!this.container) return
        
        const newScrollHeight = this.container.scrollHeight
        const scrollDiff = newScrollHeight - previousScrollHeight
        
        this.container.scrollTop = previousScrollTop + scrollDiff
      })
    }
  }
  
  /**
   * Reset scroll manager
   */
  reset() {
    this.isUserScrolling = false
    this.lastScrollTop = 0
  }
}

/**
 * React hook for conversation scroll management
 */
export function useConversationScroll(options?: ConversationScrollOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const managerRef = useRef<ConversationScrollManager | null>(null)
  
  // Initialize manager
  useEffect(() => {
    managerRef.current = new ConversationScrollManager(options)
    
    return () => {
      managerRef.current?.reset()
    }
  }, [])
  
  // Update container when ref changes
  useEffect(() => {
    managerRef.current?.setContainer(containerRef.current)
  }, [containerRef.current])
  
  // Scroll to bottom
  const scrollToBottom = useCallback((force = false) => {
    managerRef.current?.scrollToBottom(force)
  }, [])
  
  // Scroll to message
  const scrollToMessage = useCallback((messageId: string) => {
    managerRef.current?.scrollToMessage(messageId)
  }, [])
  
  // Check if near bottom
  const isNearBottom = useCallback(() => {
    return managerRef.current?.isNearBottom() ?? true
  }, [])
  
  // Handle scroll event
  const handleScroll = useCallback(() => {
    managerRef.current?.handleScroll()
  }, [])
  
  // Maintain scroll position
  const maintainScrollPosition = useCallback((callback: () => void | Promise<void>) => {
    managerRef.current?.maintainScrollPosition(callback)
  }, [])
  
  return {
    containerRef,
    scrollToBottom,
    scrollToMessage,
    isNearBottom,
    handleScroll,
    maintainScrollPosition
  }
}

/**
 * CSS for highlight effect (add to your global CSS)
 */
export const conversationScrollStyles = `
  @keyframes highlight-fade {
    0% {
      background-color: rgba(59, 130, 246, 0.2);
    }
    100% {
      background-color: transparent;
    }
  }
  
  .highlight {
    animation: highlight-fade 2s ease-out;
  }
  
  /* Show scroll to bottom button when not at bottom */
  .scroll-to-bottom {
    position: absolute;
    bottom: 20px;
    right: 20px;
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.3s ease;
    pointer-events: none;
  }
  
  .scroll-to-bottom.visible {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }
`