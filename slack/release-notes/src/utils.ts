export function extractTag(ref: string): string {
  if (!ref) {
    throw new Error('provided ref is empty or not provided at all')
  }
  if (ref.startsWith('refs/tags/')) {
    return ref.replace('refs/tags/', '')
  }
  return ref
}

export function makeChunks(body: string, size: number) {
  let chunks = []

  if (body.length < size) {
    return [body]
  }

  const lines = body.split('\n')
  let chunk: string[] = []
  let chunkSize = 0
  lines.forEach((line) => {
    if (chunkSize + line.length >= size) {
      chunks.push(chunk.join('\n'))

      chunk = []
      chunkSize = 0
    }

    chunk.push(line)
    chunkSize += line.length
  })
  if (chunkSize > 0) {
    chunks.push(chunk.join('\n'))
  }

  return chunks
}