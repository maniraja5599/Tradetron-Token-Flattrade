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
        '--single-process'
      ],
    }
    
    // Use system Chromium if path is provided
    if (chromiumExecutablePath) {
      try {
        const fs = require('fs')
        // Try multiple possible paths for Alpine Chromium
        const possiblePaths = [
          chromiumExecutablePath,
          '/usr/bin/chromium',
          '/usr/bin/chromium-browser',
          '/usr/lib/chromium/chromium'
        ]
        
        let foundPath: string | null = null
        for (const path of possiblePaths) {
          try {
            if (fs.existsSync(path)) {
              // Check if it's executable
              fs.accessSync(path, fs.constants.X_OK)
              foundPath = path
              break
            }
          } catch (e) {
            // Continue to next path
          }
        }
        
        if (foundPath) {
          launchOptions.executablePath = foundPath
          console.log(`[LoginFlow] Using system Chromium: ${foundPath}`)
        } else {
          console.warn(`[LoginFlow] System Chromium not found at any path. Tried: ${possiblePaths.join(', ')}`)
          console.warn(`[LoginFlow] Falling back to Playwright's browser (may fail in Docker)`)
        }
      } catch (error) {
        console.error(`[LoginFlow] Error checking Chromium path:`, error)
        console.warn(`[LoginFlow] Falling back to Playwright's browser`)
      }
    } else {
      console.log(`[LoginFlow] CHROMIUM_EXECUTABLE_PATH not set, using default`)
    }
    
    browser = await chromium.launch(launchOptions)

    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    })

    page = await context.newPage()

    // Navigate to Tradetron Auth URL (will redirect to Flatrade)
    console.log(`[LoginFlow] Navigating to ${loginUrl}`)
    await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 30000 })
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
    
    // Save artifacts on failure
    try {
      await fs.mkdir(artifactDir, { recursive: true })
      
      if (page) {
        const screenshot = await page.screenshot({ fullPage: true })
        await fs.writeFile(path.join(artifactDir, 'screenshot.png'), screenshot)
        
        const html = await page.content()
        await fs.writeFile(path.join(artifactDir, 'page.html'), html)
      }
    } catch (artifactError) {
      console.error(`[LoginFlow] Failed to save artifacts:`, artifactError)
    }

    return {
      status: 'fail',
      message: error.message || 'Unknown error occurred',
      artifactDir,
    }
  } finally {
    if (context) await context.close()
    if (browser) await browser.close()
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
