import DOMPurify from 'isomorphic-dompurify'

const purifier = DOMPurify

export function sanitizeHtml(input?: string | null): string {
  if (!input) {
    return ''
  }

  return purifier.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
}

