import { chromium, Browser, BrowserContext, Page } from 'playwright'
import { decrypt } from '@/lib/crypto'
import { mergeSelectors } from '@/lib/selectors'
import { authenticator } from 'otplib'
import path from 'path'
import fs from 'fs/promises'

type LoginFlowParams = {
  loginUrl: string
  brokerUsername: string
  encryptedPassword: string
  encryptedTotpSecret: string
  isDOB: boolean
  selectors?: any
  userId: string
  headful?: boolean
}

type LoginFlowResult = {
  status: 'success' | 'fail'
  message: string
  artifactDir?: string
  finalUrl?: string
  tokenGenerated?: boolean
}

export async function loginFlow(params: LoginFlowParams): Promise<LoginFlowResult> {
  const {
    loginUrl,
    brokerUsername,
    encryptedPassword,
    encryptedTotpSecret,
    isDOB: isDOBParam,
    selectors: userSelectors,
    userId,
    headful = false,
  } = params

  let browser: Browser | null = null
  let context: BrowserContext | null = null
  let page: Page | null = null
  
  const artifactDir = path.join(
    process.cwd(),
    'artifacts',
    userId,
    `run-${Date.now()}`
  )

  try {
    // Decrypt secrets
    const password = decrypt(encryptedPassword)
    let totpValue: string
    const isDOB = isDOBParam || false

    try {
      const decrypted = decrypt(encryptedTotpSecret)
      if (isDOB) {
        // Use DOB directly (format: DDMMYYYY)
        totpValue = decrypted
        console.log(`[LoginFlow] Using DOB: ${totpValue}`)
      } else {
        // Generate TOTP from base32 secret
        totpValue = authenticator.generate(decrypted)
        console.log(`[LoginFlow] Generated TOTP: ${totpValue}`)
      }
    } catch (error) {
      return {
        status: 'fail',
        message: isDOB 
          ? 'Invalid DOB format. Expected DDMMYYYY (8 digits).'
          : 'Invalid TOTP secret? Check your authenticator\'s base32 key.',
      }
    }

    // Merge selectors
    const selectors = mergeSelectors(userSelectors)

    // Launch browser
    const chromiumExecutablePath = process.env.CHROMIUM_EXECUTABLE_PATH
    
    const launchOptions: any = {
      headless: headful ? false : (process.env.HEADLESS !== 'false'),
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-breakpad',
        '--disable-client-side-phishing-detection',
        '--disable-default-apps',
        '--disable-features=TranslateUI',
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-renderer-backgrounding',
        '--disable-sync',
        '--disable-translate',
        '--disable-web-resources',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        '--enable-automation',
        '--password-store=basic',
        '--use-mock-keychain',
      ],
    }
    
    // Use system Chromium if path is provided
    if (chromiumExecutablePath) {
      try {
        const fs = require('fs')
        const path = require('path')
        const isWindows = process.platform === 'win32'
        
        // Try multiple possible paths
        // On Windows: only check the provided path
        // On Linux/Alpine: check Linux paths
        const possiblePaths = isWindows 
          ? [chromiumExecutablePath]
          : [
              chromiumExecutablePath,
              '/usr/bin/chromium',
              '/usr/bin/chromium-browser',
              '/usr/lib/chromium/chromium',
              '/usr/lib/chromium/chromium-browser'
            ]
        
        let foundPath: string | null = null
        for (const testPath of possiblePaths) {
          try {
            if (fs.existsSync(testPath)) {
              // On Windows, just check if file exists
              // On Linux, also check if executable
              if (isWindows) {
                foundPath = testPath
                console.log(`[LoginFlow] ✅ Found system Chromium at: ${foundPath}`)
                break
              } else {
                try {
                  fs.accessSync(testPath, fs.constants.X_OK)
                  foundPath = testPath
                  console.log(`[LoginFlow] ✅ Found system Chromium at: ${foundPath}`)
                  break
                } catch (e) {
                  // Not executable, continue
                  continue
                }
              }
            }
          } catch (e) {
            // Continue to next path
            continue
          }
        }
        
        if (foundPath) {
          launchOptions.executablePath = foundPath
          console.log(`[LoginFlow] Using system Chromium: ${foundPath}`)
        } else {
          console.error(`[LoginFlow] ❌ System Chromium not found at any path!`)
          console.error(`[LoginFlow] Tried: ${possiblePaths.join(', ')}`)
          console.error(`[LoginFlow] This will likely fail. Check Chromium installation.`)
          // Don't set executablePath - let Playwright try its own browser
        }
      } catch (error) {
        console.error(`[LoginFlow] Error checking Chromium path:`, error)
        console.error(`[LoginFlow] Falling back to Playwright's browser`)
      }
    } else {
      console.log(`[LoginFlow] CHROMIUM_EXECUTABLE_PATH not set, using Playwright's default browser`)
      
      // Try to get Playwright's bundled browser path
      try {
        const playwrightPath = chromium.executablePath()
        if (playwrightPath) {
          const fs = require('fs')
          if (fs.existsSync(playwrightPath)) {
            launchOptions.executablePath = playwrightPath
            console.log(`[LoginFlow] ✅ Using Playwright's bundled browser: ${playwrightPath}`)
          } else {
            console.warn(`[LoginFlow] ⚠️ Playwright browser path reported but file not found: ${playwrightPath}`)
            console.warn(`[LoginFlow] ⚠️ This may cause browser launch to fail. Browser may need to be installed.`)
          }
        } else {
          console.warn(`[LoginFlow] ⚠️ chromium.executablePath() returned null - browser may not be installed`)
        }
      } catch (error) {
        console.warn(`[LoginFlow] ⚠️ Could not get Playwright browser path:`, error)
        console.warn(`[LoginFlow] ⚠️ Will attempt to launch without explicit path`)
      }
    }
    
    console.log(`[LoginFlow] Launching browser with options:`, {
      headless: launchOptions.headless,
      executablePath: launchOptions.executablePath || 'default (Playwright will find it)',
      argsCount: launchOptions.args.length,
      platform: process.platform
    })
    
    try {
      browser = await chromium.launch(launchOptions)
      console.log(`[LoginFlow] ✅ Browser launched successfully`)
    } catch (launchError: any) {
      console.error(`[LoginFlow] ❌ Failed to launch browser:`, launchError)
      console.error(`[LoginFlow] Launch error details:`, {
        message: launchError.message,
        stack: launchError.stack,
        executablePath: launchOptions.executablePath,
        headless: launchOptions.headless,
        platform: process.platform
      })
      
      // Provide helpful error message
      let errorMessage = `Browser launch failed: ${launchError.message}`
      if (launchError.message.includes('spawn') || launchError.message.includes('ENOENT')) {
        errorMessage += '\n\n💡 Browser executable not found. This usually means:\n'
        errorMessage += '1. Playwright browser was not installed during build\n'
        errorMessage += '2. Check Railway build logs to ensure "npm run playwright:install chromium" completed\n'
        errorMessage += '3. The browser may need to be installed at runtime (this is attempted automatically)'
      }
      
      throw new Error(errorMessage)
    }

    try {
      context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      })
      console.log(`[LoginFlow] ✅ Browser context created`)
    } catch (contextError: any) {
      console.error(`[LoginFlow] ❌ Failed to create browser context:`, contextError)
      throw new Error(`Browser context creation failed: ${contextError.message}`)
    }

    try {
      page = await context.newPage()
      console.log(`[LoginFlow] ✅ New page created`)
    } catch (pageError: any) {
      console.error(`[LoginFlow] ❌ Failed to create new page:`, pageError)
      throw new Error(`Page creation failed: ${pageError.message}`)
    }

    // Navigate to Tradetron Auth URL (will redirect to Flatrade)
    console.log(`[LoginFlow] Navigating to ${loginUrl}`)
    try {
      await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 30000 })
      console.log(`[LoginFlow] ✅ Page navigation completed`)
    } catch (navError: any) {
      console.error(`[LoginFlow] ❌ Navigation failed:`, navError)
      console.error(`[LoginFlow] Navigation error details:`, {
        message: navError.message,
        url: loginUrl,
        browserConnected: browser?.isConnected(),
        contextClosed: context?.browser() === null
      })
      throw new Error(`Navigation failed: ${navError.message}`)
    }
    // Wait for page to fully load and stabilize after redirect
    await page.waitForTimeout(5000) // Wait for redirect and page to fully load
    
    // Wait for page to be ready - try multiple strategies
    try {
      // Strategy 1: Wait for network idle
      await page.waitForLoadState('networkidle', { timeout: 10000 })
    } catch (error) {
      // Continue even if networkidle doesn't complete
    }
    
    // Strategy 2: Wait for DOM to be stable
    await page.waitForTimeout(2000) // Additional wait for dynamic content
    
    // Wait for login form to be visible - try multiple selectors
    let formDetected = false
    const formSelectors = [
      'input[type="text"]',
      'input[type="password"]',
      'input[name*="user"]',
      'input[name*="username"]',
      'input[id*="user"]',
      'input[id*="username"]',
      'form',
      'button[type="submit"]'
    ]
    
    for (const selector of formSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000, state: 'visible' })
        formDetected = true
        console.log(`[LoginFlow] ✅ Login form detected using selector: ${selector}`)
        break
      } catch (error) {
        continue
      }
    }
    
    if (!formDetected) {
      // Last attempt: check if any input exists (even if not immediately visible)
      const hasAnyInput = await page.locator('input').count() > 0
      if (hasAnyInput) {
        console.log('[LoginFlow] ⚠️ Form elements found but may not be immediately visible - proceeding anyway')
        formDetected = true
      } else {
        console.log('[LoginFlow] ⚠️ Warning: Login form not immediately visible - will attempt to proceed')
      }
    }

    // Fill username - try multiple approaches
    console.log(`[LoginFlow] Filling username: ${brokerUsername}`)
    let usernameFilled = false
    
    // First try: Find first visible text input
    try {
      const textInputs = await page.locator('input[type="text"]').all()
      for (const input of textInputs) {
        const isVisible = await input.isVisible()
        if (isVisible) {
          await input.fill(brokerUsername)
          usernameFilled = true
          console.log(`[LoginFlow] Username filled using first visible text input`)
          break
        }
      }
    } catch (error) {
      console.log('[LoginFlow] First approach failed, trying selectors...')
    }

    // Fallback: Try selectors
    if (!usernameFilled) {
      for (const selector of selectors.username) {
        try {
          if (selector.startsWith('xpath=')) {
            const xpath = selector.replace('xpath=', '')
            const element = page.locator(`xpath=${xpath}`).first()
            const count = await element.count()
            if (count > 0) {
              await element.waitFor({ state: 'visible', timeout: 3000 })
              await element.fill(brokerUsername)
              usernameFilled = true
              console.log(`[LoginFlow] Username filled using: ${selector}`)
              break
            }
          } else {
            const element = page.locator(selector).first()
            const count = await element.count()
            if (count > 0) {
              await element.waitFor({ state: 'visible', timeout: 3000 })
              await element.fill(brokerUsername)
              usernameFilled = true
              console.log(`[LoginFlow] Username filled using: ${selector}`)
              break
            }
          }
        } catch (error) {
          continue
        }
      }
    }

    if (!usernameFilled) {
      throw new Error('Could not find username field')
    }

    await page.waitForTimeout(500)

    // Fill password
    console.log(`[LoginFlow] Filling password`)
    let passwordFilled = false
    for (const selector of selectors.password) {
      try {
        if (selector.startsWith('xpath=')) {
          const xpath = selector.replace('xpath=', '')
          const element = page.locator(`xpath=${xpath}`).first()
          await element.waitFor({ state: 'visible', timeout: 2000 })
          if (await element.count() > 0) {
            await element.fill(password)
            passwordFilled = true
            console.log(`[LoginFlow] Password filled using: ${selector}`)
            break
          }
        } else {
          const element = page.locator(selector).first()
          await element.waitFor({ state: 'visible', timeout: 2000 })
          await element.fill(password)
          passwordFilled = true
          console.log(`[LoginFlow] Password filled using: ${selector}`)
          break
        }
      } catch (error) {
        continue
      }
    }

    if (!passwordFilled) {
      throw new Error('Could not find password field')
    }

    await page.waitForTimeout(500)

    // Check if TOTP field is already visible
    let totpFieldVisible = false
    for (const selector of selectors.totp) {
      try {
        if (selector.startsWith('xpath=')) {
          const xpath = selector.replace('xpath=', '')
          const element = await page.locator(`xpath=${xpath}`).first()
          if (await element.count() > 0) {
            totpFieldVisible = true
            break
          }
        } else {
          const element = await page.locator(selector).first()
          if (await element.count() > 0 && await element.isVisible()) {
            totpFieldVisible = true
            break
          }
        }
      } catch (error) {
        continue
      }
    }

    if (totpFieldVisible) {
      // Fill TOTP/DOB before first submit
      console.log(`[LoginFlow] TOTP/DOB field visible, filling before submit`)
      await fillTotp(page, selectors.totp, totpValue)
      await page.waitForTimeout(500)
    }

    // Click submit
    console.log(`[LoginFlow] Clicking submit`)
    let submitted = false
    for (const selector of selectors.submit) {
      try {
        if (selector.startsWith('xpath=')) {
          const xpath = selector.replace('xpath=', '')
          const element = await page.locator(`xpath=${xpath}`).first()
          if (await element.count() > 0) {
            await element.click()
            submitted = true
            console.log(`[LoginFlow] Submitted using: ${selector}`)
            break
          }
        } else if (selector.startsWith('text=')) {
          const text = selector.replace('text=', '')
          await page.click(`text=${text}`)
          submitted = true
          console.log(`[LoginFlow] Submitted using: ${selector}`)
          break
        } else {
          await page.click(selector)
          submitted = true
          console.log(`[LoginFlow] Submitted using: ${selector}`)
          break
        }
      } catch (error) {
        continue
      }
    }

    if (!submitted) {
      throw new Error('Could not find submit button')
    }

    // Wait for navigation or TOTP field to appear
    await page.waitForTimeout(2000)

    // Check if TOTP field appeared after first submit
    if (!totpFieldVisible) {
      let totpNeeded = false
      for (const selector of selectors.totp) {
        try {
          if (selector.startsWith('xpath=')) {
            const xpath = selector.replace('xpath=', '')
            const element = await page.locator(`xpath=${xpath}`).first()
            if (await element.count() > 0) {
              totpNeeded = true
              break
            }
          } else {
            const element = await page.locator(selector).first()
            if (await element.count() > 0 && await element.isVisible()) {
              totpNeeded = true
              break
            }
          }
        } catch (error) {
          continue
        }
      }

      if (totpNeeded) {
        // Generate fresh TOTP for second step (or use DOB again)
        if (!isDOB) {
          // Regenerate TOTP if using TOTP secret
          const decrypted = decrypt(encryptedTotpSecret)
          totpValue = authenticator.generate(decrypted)
          console.log(`[LoginFlow] Regenerated TOTP for second step`)
        }
        console.log(`[LoginFlow] TOTP/DOB field appeared after submit, filling with ${isDOB ? 'DOB' : 'fresh TOTP'}`)
        await fillTotp(page, selectors.totp, totpValue)
        await page.waitForTimeout(500)

        // Submit again
        for (const selector of selectors.submit) {
          try {
            if (selector.startsWith('xpath=')) {
              const xpath = selector.replace('xpath=', '')
              const element = await page.locator(`xpath=${xpath}`).first()
              if (await element.count() > 0) {
                await element.click()
                break
              }
            } else if (selector.startsWith('text=')) {
              const text = selector.replace('text=', '')
              await page.click(`text=${text}`)
              break
            } else {
              await page.click(selector)
              break
            }
          } catch (error) {
            continue
          }
        }
      }
    }

    // Wait for navigation to complete and redirect back to Tradetron
    await page.waitForLoadState('networkidle', { timeout: 20000 })
    await page.waitForTimeout(3000) // Wait for Tradetron redirect
    
    // Check if there's another redirect (some pages redirect again after showing error)
    try {
      await page.waitForLoadState('networkidle', { timeout: 5000 })
      await page.waitForTimeout(2000) // Wait a bit more for any final redirects
    } catch (e) {
      // Timeout is okay, page might be stable
    }

    const finalUrl = page.url()
    const pageContent = await page.content()
    const pageText = await page.textContent('body') || ''
    const pageTitle = await page.title().catch(() => '')
    const lowerPageText = pageText.toLowerCase()
    const lowerPageContent = pageContent.toLowerCase()
    const lowerPageTitle = pageTitle.toLowerCase()

    console.log(`[LoginFlow] Final URL: ${finalUrl}`)
    console.log(`[LoginFlow] Page title: ${pageTitle}`)
    console.log(`[LoginFlow] Page text length: ${pageText.length} chars`)
    console.log(`[LoginFlow] Page text sample: ${pageText.substring(0, 300)}...`)
    
    // Check for visible error messages on the page (not just in text)
    let visibleErrors: string[] = []
    try {
      const errorSelectors = [
        '.error:visible',
        '.error-message:visible',
        '.alert-danger:visible',
        '[role="alert"]:visible',
        '.message.error:visible',
        '#error:visible',
        '.invalid-feedback:visible',
        '.text-danger:visible',
        '[class*="error"]:visible',
        '[class*="invalid"]:visible',
      ]
      for (const selector of errorSelectors) {
        try {
          const elements = await page.locator(selector).all()
          for (const element of elements) {
            const text = await element.textContent()
            if (text && text.trim()) {
              visibleErrors.push(text.trim())
            }
          }
        } catch (e) {
          continue
        }
      }
      if (visibleErrors.length > 0) {
        console.log(`[LoginFlow] Found visible error messages: ${visibleErrors.join('; ')}`)
      }
    } catch (e) {
      // Could not check for visible errors
    }

    // IMPORTANT: Check for SUCCESS indicators FIRST before checking for errors
    // This prevents false negatives where success pages have error-related words
    
    // Check for explicit success messages in page content (highest priority)
    // Also check if page text contains just "Success" (common on success pages)
    const hasExplicitSuccessText = 
      lowerPageText.includes('token generated successfully') ||
      (lowerPageText.includes('success') && (lowerPageText.includes('token') || lowerPageText.includes('generated'))) ||
      lowerPageContent.includes('token generated successfully') ||
      (pageText.includes('Success') && (pageText.includes('Token') || pageText.includes('generated'))) ||
      // Check if page shows just "Success" and we're on a tradetron/auth URL with sid
      // OR if page text is primarily just "Success" (common on success pages)
      (pageText.trim().toLowerCase().includes('success') && finalUrl.includes('sid=')) ||
      (pageText.trim().toLowerCase() === 'success' || pageText.trim().toLowerCase().startsWith('success'))
    
    // Check for success URLs
    const hasFinalSuccessUrl = 
      (finalUrl.includes('tradetron.tech') && (finalUrl.includes('/success') || finalUrl.includes('token=') || finalUrl.includes('sid='))) ||
      (finalUrl.includes('flattrade.broker.tradetron.tech') && finalUrl.includes('/success')) ||
      (finalUrl.includes('tradetron') && finalUrl.includes('success'))
    
    const hasSuccessUrl = hasFinalSuccessUrl ||
      (finalUrl.includes('auth.flattrade.in') && finalUrl.includes('sid=') && (hasExplicitSuccessText || pageText.trim().toLowerCase().includes('success')))
    
    // If we have strong success indicators, treat as success immediately
    if (hasExplicitSuccessText || hasSuccessUrl) {
      console.log(`[LoginFlow] ✅ Strong success indicators detected!`)
      console.log(`[LoginFlow] - Explicit success text: ${hasExplicitSuccessText}`)
      console.log(`[LoginFlow] - Success URL: ${hasSuccessUrl}`)
      console.log(`[LoginFlow] - Final URL: ${finalUrl}`)
      console.log(`[LoginFlow] - Page text sample: ${pageText.substring(0, 200)}`)
      
      // Verify we're NOT still on the login page (no sid= or token=)
      const isStillOnLoginPage = 
        finalUrl.includes('auth') && 
        (finalUrl.includes('flattrade') || finalUrl.includes('login')) &&
        !finalUrl.includes('sid=') &&
        !finalUrl.includes('token=')
      
      // If we have sid= in URL and success text, it's definitely a success
      // OR if we have success URL pattern, it's a success
      const hasSessionId = finalUrl.includes('sid=')
      const hasToken = finalUrl.includes('token=')
      
      // Return success if:
      // 1. We have a session ID or token in URL AND success text, OR
      // 2. We have a final success URL, OR
      // 3. We're not on login page and have explicit success text
      if (hasFinalSuccessUrl || 
          (hasSessionId && hasExplicitSuccessText) ||
          (hasToken && hasExplicitSuccessText) ||
          (!isStillOnLoginPage && hasExplicitSuccessText && (hasSessionId || hasToken || finalUrl.includes('tradetron')))) {
        console.log(`[LoginFlow] ✅ Returning success!`)
        console.log(`[LoginFlow] - hasFinalSuccessUrl: ${hasFinalSuccessUrl}`)
        console.log(`[LoginFlow] - hasSessionId: ${hasSessionId}, hasToken: ${hasToken}`)
        console.log(`[LoginFlow] - isStillOnLoginPage: ${isStillOnLoginPage}`)
        return {
          status: 'success',
          message: 'Token generated successfully',
          finalUrl,
          tokenGenerated: true,
        }
      } else {
        console.log(`[LoginFlow] ⚠️ Success indicators found but conditions not met`)
        console.log(`[LoginFlow] - isStillOnLoginPage: ${isStillOnLoginPage}`)
        console.log(`[LoginFlow] - hasSessionId: ${hasSessionId}`)
        console.log(`[LoginFlow] - hasExplicitSuccessText: ${hasExplicitSuccessText}`)
      }
    }
    
    // Now check for ERROR messages (only if we didn't find strong success indicators)
    // Filter out success messages that might be in error-styled elements
    const realVisibleErrors = visibleErrors.filter(err => {
      const lowerErr = err.toLowerCase()
      // Don't treat success messages as errors
      return !lowerErr.includes('token generated successfully') && 
             !(lowerErr.includes('success') && (lowerErr.includes('token') || lowerErr.includes('generated'))) &&
             !lowerErr.includes('success')
    })
    
    if (realVisibleErrors.length > 0) {
      const errorMessage = realVisibleErrors[0] || 'Authentication failed - Error detected on page'
      console.log(`[LoginFlow] ❌ Visible error detected: ${errorMessage}`)
      throw new Error(errorMessage)
    }
    
    // Check for error hints in page content
    const hasErrorHints = selectors.errorHints.some(hint => {
      const lowerHint = hint.toLowerCase()
      return lowerPageText.includes(lowerHint) ||
             lowerPageContent.includes(lowerHint) ||
             lowerPageTitle.includes(lowerHint) ||
             finalUrl.toLowerCase().includes('error') ||
             finalUrl.toLowerCase().includes('fail')
    })
    
    // Only treat as error if we have error hints AND no success indicators
    // CRITICAL: If page shows "Success" text, NEVER treat it as an error
    if (hasErrorHints && !hasExplicitSuccessText && !hasSuccessUrl) {
      // Double-check: if page text is primarily "Success", don't treat as error
      const pageTextTrimmed = pageText.trim().toLowerCase()
      if (pageTextTrimmed === 'success' || 
          pageTextTrimmed.startsWith('success') ||
          (pageTextTrimmed.includes('success') && finalUrl.includes('sid='))) {
        console.log(`[LoginFlow] ⚠️ Error hints found but page shows "Success" - treating as success`)
        // Even if we have error hints, if page shows Success with sid=, it's a success
        if (finalUrl.includes('sid=') || finalUrl.includes('token=')) {
          return {
            status: 'success',
            message: 'Token generated successfully',
            finalUrl,
            tokenGenerated: true,
          }
        }
      }
      
      console.log(`[LoginFlow] ❌ Error detected in page content!`)
      // Try to extract the actual error message
      let errorMessage = 'Authentication failed - Error detected on page'
      try {
        // Look for common error message selectors
        const errorSelectors = [
          '.error',
          '.error-message',
          '.alert-danger',
          '[role="alert"]',
          '.message.error',
          '#error',
          '.invalid-feedback',
          '.text-danger',
        ]
        for (const selector of errorSelectors) {
          try {
            const errorElement = await page.locator(selector).first()
            if (await errorElement.count() > 0) {
              const errorText = await errorElement.textContent()
              if (errorText && errorText.trim()) {
                // Don't use success messages as error messages
                const lowerErrorText = errorText.toLowerCase().trim()
                // If the error text is just "Success" or starts with "Success", ignore it
                if (lowerErrorText === 'success' || 
                    lowerErrorText.startsWith('success') ||
                    lowerErrorText.includes('token generated successfully')) {
                  console.log(`[LoginFlow] ⚠️ Ignoring "Success" text found in error element`)
                  continue // Skip this error text, look for a real error
                }
                if (!lowerErrorText.includes('success') && 
                    !lowerErrorText.includes('token generated')) {
                  errorMessage = errorText.trim()
                  console.log(`[LoginFlow] Found error message: ${errorMessage}`)
                  break
                }
              }
            }
          } catch (e) {
            continue
          }
        }
      } catch (e) {
        // Could not extract specific error, use generic message
      }
      
      // Final check: if error message is just "Success", don't throw error
      if (errorMessage.trim().toLowerCase() === 'success' ||
          errorMessage.trim().toLowerCase().startsWith('success')) {
        console.log(`[LoginFlow] ⚠️ Error message is "Success" - this is likely a false positive`)
        // If we have sid= in URL, treat as success
        if (finalUrl.includes('sid=') || finalUrl.includes('token=')) {
          return {
            status: 'success',
            message: 'Token generated successfully',
            finalUrl,
            tokenGenerated: true,
          }
        }
        // Otherwise, use generic error message instead of "Success"
        errorMessage = 'Authentication failed - Could not verify success'
      }
      
      throw new Error(errorMessage)
    }

    // If we got here, we didn't find strong success indicators and no errors were thrown
    // This means we're in an ambiguous state - check if we're on intermediate auth page
    const isIntermediateAuthPage = 
      finalUrl.includes('auth.flattrade.in') && 
      finalUrl.includes('sid=') &&
      !finalUrl.includes('tradetron.tech')
    
    // Additional check: If we're on intermediate auth page, wait a bit more to see if we get final redirect
    // (hasFinalSuccessUrl is already checked above, so if we're here it wasn't a final success URL)
    if (isIntermediateAuthPage) {
      console.log(`[LoginFlow] On intermediate auth page, waiting for final redirect...`)
      try {
        await page.waitForTimeout(3000) // Wait for potential redirect
        const updatedUrl = page.url()
        if (updatedUrl !== finalUrl && updatedUrl.includes('tradetron.tech')) {
          console.log(`[LoginFlow] Got final redirect to: ${updatedUrl}`)
          // Re-check with updated URL
          const updatedPageText = await page.textContent('body') || ''
          const updatedHasError = selectors.errorHints.some(hint => 
            updatedPageText.toLowerCase().includes(hint.toLowerCase())
          )
          if (!updatedHasError && updatedUrl.includes('tradetron.tech')) {
            return {
              status: 'success',
              message: 'Token generated successfully',
              finalUrl: updatedUrl,
              tokenGenerated: true,
            }
          }
        }
      } catch (e) {
        // Redirect didn't happen, continue with original check
      }
    }

    // If we reach here, we couldn't determine success or failure definitively
    // Check if we're still on the login page (credentials might be wrong)
    const isStillOnLoginPage = 
      finalUrl.includes('auth') && 
      (finalUrl.includes('flattrade') || finalUrl.includes('login')) &&
      !finalUrl.includes('sid=') &&
      !finalUrl.includes('token=')
    
    if (isStillOnLoginPage) {
      throw new Error('Authentication failed - Still on login page. Check username, password, or DOB.')
    }
    
    // Default to failure if we can't determine success
    throw new Error('Login verification failed - URL or content did not match success criteria')
  } catch (error: any) {
    console.error(`[LoginFlow] Error:`, error)
    console.error(`[LoginFlow] Error details:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
      browserConnected: browser?.isConnected() ?? false,
      contextExists: context !== null,
      pageExists: page !== null
    })
    
    // Save artifacts on failure
    try {
      await fs.mkdir(artifactDir, { recursive: true })
      
      if (page && !page.isClosed()) {
        try {
          const screenshot = await page.screenshot({ fullPage: true }).catch(() => null)
          if (screenshot) {
            await fs.writeFile(path.join(artifactDir, 'screenshot.png'), screenshot)
          }
          
          const html = await page.content().catch(() => null)
          if (html) {
            await fs.writeFile(path.join(artifactDir, 'page.html'), html)
          }
        } catch (pageError) {
          console.error(`[LoginFlow] Failed to capture page artifacts:`, pageError)
        }
      }
      
      // Save error log
      const errorLog = {
        timestamp: new Date().toISOString(),
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        browser: {
          connected: browser?.isConnected() ?? false,
          contextExists: context !== null,
          pageExists: page !== null
        }
      }
      await fs.writeFile(
        path.join(artifactDir, 'error.json'), 
        JSON.stringify(errorLog, null, 2)
      )
    } catch (artifactError) {
      console.error(`[LoginFlow] Failed to save artifacts:`, artifactError)
    }

    return {
      status: 'fail',
      message: error.message || 'Unknown error occurred',
      artifactDir,
    }
  } finally {
    try {
      if (context && !context.browser()?.isConnected()) {
        console.log(`[LoginFlow] Context already closed`)
      } else if (context) {
        await context.close()
        console.log(`[LoginFlow] Context closed`)
      }
    } catch (e) {
      console.error(`[LoginFlow] Error closing context:`, e)
    }
    
    try {
      if (browser && browser.isConnected()) {
        await browser.close()
        console.log(`[LoginFlow] Browser closed`)
      } else {
        console.log(`[LoginFlow] Browser already closed or disconnected`)
      }
    } catch (e) {
      console.error(`[LoginFlow] Error closing browser:`, e)
    }
  }
}

async function fillTotp(page: Page, selectors: readonly string[], totp: string): Promise<void> {
  for (const selector of selectors) {
    try {
      if (selector.startsWith('xpath=')) {
        const xpath = selector.replace('xpath=', '')
        const element = await page.locator(`xpath=${xpath}`).first()
        if (await element.count() > 0) {
          await element.fill(totp)
          return
        }
      } else {
        await page.fill(selector, totp)
        return
      }
    } catch (error) {
      continue
    }
  }
  throw new Error('Could not find TOTP field')
}
