import Image from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import ResizableImage from './ResizableImage'

export const ResizableImageExtension = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        renderHTML: attributes => {
          if (!attributes.width) return {}
          return { width: attributes.width }
        }
      },
      height: {
        default: null,
        renderHTML: attributes => {
          if (!attributes.height) return {}
          return { height: attributes.height }
        }
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImage)
  }
})
