import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeUrl(url: string | undefined | null) {
  if (!url) return ''
  let normalized = url.replace(/\\/g, '/')
  
  if (normalized.startsWith('http://') || normalized.startsWith('https://') || normalized.startsWith('data:') || normalized.startsWith('blob:')) {
    return normalized
  }

  if (normalized.startsWith('local://')) {
    return normalized.replace('local://', 'file:///')
  }
  
  if (!normalized.startsWith('file://')) {
    // If it's a Windows drive letter like C:/, prepend file:///
    if (/^[A-Za-z]:\//.test(normalized)) {
      normalized = 'file:///' + normalized
    } else if (normalized.startsWith('/')) { 
      normalized = 'file://' + normalized
    } else {
      normalized = 'file:///' + normalized
    }
  }

  // Ensure file:// has 3 slashes if it's followed by a drive letter
  if (normalized.match(/^file:\/\/[A-Za-z]:/)) {
    normalized = normalized.replace(/^file:\/\//, 'file:///')
  }

  return normalized
}

export function getSafeMediaUrl(url: string | undefined | null) {
  if (!url) return ''
  let normalized = url.replace(/\\/g, '/')
  if (normalized.startsWith('file:///')) {
    const pathPart = normalized.slice(8)
    return 'local-media://' + encodeURIComponent(pathPart).replace(/%2F/g, '/').replace(/%3A/g, ':')
  } else if (/^[A-Za-z]:\//.test(normalized)) {
    return 'local-media://' + encodeURIComponent(normalized).replace(/%2F/g, '/').replace(/%3A/g, ':')
  }
  return normalized
}
