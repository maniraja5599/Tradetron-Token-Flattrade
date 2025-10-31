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
    }
    
    console.log(`[LoginFlow] Launching browser with options:`, {
      headless: launchOptions.headless,
      executablePath: launchOptions.executablePath || 'default',
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
        headless: launchOptions.headless
      })
      throw new Error(`Browser launch failed: ${launchError.message}`)
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
    await page.waitForTimeout(5000) // Wait for redirect and page to fully load

    // Wait for login form to be visible
    try {
      await page.waitForSelector('input[type="text"], input[type="password"], button', { timeout: 10000 })
      console.log('[LoginFlow] Login form detected')
    } catch (error) {
      console.log('[LoginFlow] Warning: Login form not immediately visible')
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

    const finalUrl = page.url()
    const pageContent = await page.content()
    const pageText = await page.textContent('body') || ''

    // Check success - Tradetron redirect means token was generated
    const isSuccess = 
      finalUrl.includes('tradetron.tech') ||
      finalUrl.includes('tradetron') ||
      selectors.successHints.some(hint => 
        pageText.toLowerCase().includes(hint.toLowerCase()) ||
        pageContent.toLowerCase().includes(hint.toLowerCase())
      )

    if (isSuccess) {
      console.log(`[LoginFlow] Success! Final URL: ${finalUrl}`)
      return {
        status: 'success',
        message: 'Token generated successfully',
        finalUrl,
        tokenGenerated: true,
      }
    } else {
      throw new Error('Login verification failed - URL or content did not match success criteria')
    }
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
