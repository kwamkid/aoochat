// src/services/platforms/platform-registry.ts

import { PlatformServiceFactory } from './platform-service.interface'
import { facebookService } from './facebook/facebook.service'
// Import other platform services as you create them
// import { lineService } from './line/line.service'
// import { whatsappService } from './whatsapp/whatsapp.service'

/**
 * Initialize and register all platform services
 */
export function initializePlatformServices() {
  // Register Facebook service
  PlatformServiceFactory.register('facebook', facebookService)
  
  // Register other platforms as you implement them
  // PlatformServiceFactory.register('line', lineService)
  // PlatformServiceFactory.register('whatsapp', whatsappService)
  // PlatformServiceFactory.register('instagram', instagramService)
  
  console.log('Platform services initialized:', PlatformServiceFactory.getRegisteredPlatforms())
}

// Initialize on import
initializePlatformServices()

// Export factory for use in components
export { PlatformServiceFactory }