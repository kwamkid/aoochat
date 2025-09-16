// src/components/messages/index.tsx

export { TextMessage } from './text-message'
export { ImageMessage } from './image-message'
export { VideoMessage } from './video-message'
export { FileMessage } from './file-message'
export { AudioMessage } from './audio-message'
export { StickerMessage } from './sticker-message'
export { LocationMessage } from './location-message'
export { ContactMessage } from './contact-message'
export { ProductMessage } from './product-message'
export { RichMessage } from './rich-message'

// Message Renderer - จัดการแสดงผลตาม type
export { MessageRenderer } from './message-renderer'

// Message Composer Components - Phase 2
// export { MessageComposer } from './message-composer'
// export { QuickReplyComposer } from './quick-reply-composer'
// export { RichMessageBuilder } from './rich-message-builder'