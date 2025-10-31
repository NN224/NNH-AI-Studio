'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <h1 className="text-4xl font-bold text-white">Something went wrong!</h1>
            <p className="text-gray-400">{error.message}</p>
            <button
              onClick={reset}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}

