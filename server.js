// server.js - Custom Next.js server for localhost development
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')
const path = require('path')
const os = require('os')

// Setup Google Service Account credentials from base64 env var (for Render)
// This allows storing the service account JSON securely as an environment variable
if (process.env.GSA_JSON_B64) {
  try {
    const json = Buffer.from(process.env.GSA_JSON_B64, 'base64').toString('utf8')
    
    // Validate JSON before writing
    try {
      JSON.parse(json)
    } catch (parseError) {
      console.error('[Server] ⚠️ Invalid JSON in GSA_JSON_B64:', parseError.message)
      console.error('[Server] 💡 Please check that GSA_JSON_B64 is properly base64-encoded')
      throw parseError
    }
    
    // Validate it's a service account JSON (check for required fields)
    const parsed = JSON.parse(json)
    if (!parsed.type || parsed.type !== 'service_account') {
      console.warn('[Server] ⚠️ GSA_JSON_B64 does not appear to be a service account JSON')
    }
    if (!parsed.client_email || !parsed.private_key) {
      console.warn('[Server] ⚠️ GSA_JSON_B64 missing required fields (client_email or private_key)')
    }
    
    const tempPath = path.join(os.tmpdir(), 'gsa.json')
    fs.writeFileSync(tempPath, json, 'utf8')
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tempPath
    console.log('[Server] ✅ Google Service Account credentials loaded from GSA_JSON_B64')
    console.log(`[Server] Service account email: ${parsed.client_email || 'unknown'}`)
  } catch (error) {
    console.error('[Server] ⚠️ Failed to load GSA_JSON_B64:', error.message)
    console.error('[Server] 💡 Falling back to GOOGLE_SERVICE_ACCOUNT_KEY or API Key')
    // Don't set GOOGLE_APPLICATION_CREDENTIALS if GSA_JSON_B64 is invalid
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS
  }
}

const dev = process.env.NODE_ENV !== 'production'
// Always bind to 0.0.0.0 in production (required for Render/Railway/etc)
// In development, use localhost for security
const hostname = dev ? (process.env.HOSTNAME || 'localhost') : '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

console.log(`Starting server on ${hostname}:${port}`)
console.log(`NODE_ENV: ${process.env.NODE_ENV}`)
console.log(`PORT: ${port}`)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
  // Log error but don't exit immediately
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  // Log error but don't exit immediately
})

app.prepare().then(() => {
  console.log('Next.js app prepared successfully')
  
  // Time window restriction (8:15 AM to 9:00 AM IST)
  const TIME_WINDOW_ENABLED = process.env.TIME_WINDOW_ENABLED !== 'false' // Enabled by default
  const TIME_WINDOW_START = process.env.TIME_WINDOW_START || '08:15'
  const TIME_WINDOW_END = process.env.TIME_WINDOW_END || '09:00'
  const TIME_WINDOW_TIMEZONE = process.env.TIME_WINDOW_TIMEZONE || 'Asia/Kolkata'
  
  function getCurrentTimeInTimezone(timezone) {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const parts = formatter.formatToParts(now)
    return {
      hour: parseInt(parts.find(p => p.type === 'hour')?.value || '0'),
      minute: parseInt(parts.find(p => p.type === 'minute')?.value || '0'),
    }
  }
  
  function isWithinTimeWindow() {
    if (!TIME_WINDOW_ENABLED) return true // Time window disabled
    
    const [startHour, startMinute] = TIME_WINDOW_START.split(':').map(Number)
    const [endHour, endMinute] = TIME_WINDOW_END.split(':').map(Number)
    const current = getCurrentTimeInTimezone(TIME_WINDOW_TIMEZONE)
    
    const currentMinutes = current.hour * 60 + current.minute
    const startMinutes = startHour * 60 + startMinute
    const endMinutes = endHour * 60 + endMinute
    
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }
  
  // Allowed paths that work even outside time window (read-only operations)
  const ALLOWED_PATHS = [
    '/api/health',
    '/api/schedule',
    '/api/users', // GET only
    '/api/runs', // GET only
  ]
  
  function isAllowedPath(url) {
    // Allow health checks and read-only API calls
    if (ALLOWED_PATHS.some(path => url.startsWith(path))) {
      // For /api/users and /api/runs, only allow GET requests
      if (url.startsWith('/api/users') || url.startsWith('/api/runs')) {
        return true // We'll check method in the route handler
      }
      return true
    }
    // Allow static assets and pages (read-only)
    if (url.startsWith('/_next/') || url.startsWith('/favicon') || !url.startsWith('/api/')) {
      return true
    }
    return false
  }
  
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      const url = parsedUrl.pathname || ''
      
      // Check time window for API routes that modify data
      if (TIME_WINDOW_ENABLED && url.startsWith('/api/') && !isAllowedPath(url)) {
        if (!isWithinTimeWindow()) {
          const current = getCurrentTimeInTimezone(TIME_WINDOW_TIMEZONE)
          const currentTime = `${String(current.hour).padStart(2, '0')}:${String(current.minute).padStart(2, '0')}`
          
          res.statusCode = 503 // Service Unavailable
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            error: 'Server is in sleep mode',
            message: `Server operations are restricted to ${TIME_WINDOW_START} - ${TIME_WINDOW_END} ${TIME_WINDOW_TIMEZONE}. Current time: ${currentTime} ${TIME_WINDOW_TIMEZONE}`,
            currentTime: `${currentTime} ${TIME_WINDOW_TIMEZONE}`,
            allowedWindow: `${TIME_WINDOW_START} - ${TIME_WINDOW_END} ${TIME_WINDOW_TIMEZONE}`,
            timeWindowEnabled: true,
          }))
          return
        }
      }
      
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })
  
  server.listen(port, hostname, (err) => {
    if (err) {
      console.error('Failed to start server:', err)
      process.exit(1)
    }
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log('Server is running and waiting for requests...')
  })
  
  // Keep process alive
  server.on('error', (err) => {
    console.error('Server error:', err)
  })
  
}).catch((err) => {
  console.error('Failed to prepare Next.js app:', err)
  console.error('Error stack:', err.stack)
  process.exit(1)
})



