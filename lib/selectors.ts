export const defaultSelectors = {
  username: [
    // Flatrade specific - first text input
    "input#input-19",
    "input[id^='input-']",
    "input[type='text']:first-of-type",
    "input[type='text']",
    // Generic fallbacks
    "input[placeholder*='User ID']",
    "input[placeholder*='UserID']",
    "input[placeholder*='Username']",
    "input[placeholder*='Client']",
    "input[placeholder*='Client ID']",
    "input[name='username']",
    "input[name='userId']",
    "input[name='userid']",
    "input[name='clientcode']",
    "input[name='client']",
    "input[id*='username']",
    "input[id*='userid']",
    "input[id*='client']",
    "xpath=//input[@type='text' and not(@type='password')]",
    "xpath=//input[contains(@placeholder,'user') or contains(@placeholder,'client') or contains(@name,'user') or contains(@name,'client')]",
  ],
  password: [
    // Flatrade specific - password field
    "input#pwd",
    "input[id='pwd']",
    // Generic fallbacks
    "input[type='password']:first-of-type",
    "input[type='password']",
    "input[name='password']",
    "input[name='pwd']",
    "input[id*='password']",
    "input[id*='pwd']",
    "xpath=//input[@type='password']",
  ],
  totp: [
    // Flatrade specific - TOTP field (second password field)
    "input#pan",
    "input[id='pan']",
    "input[type='password']:last-of-type",
    // Generic fallbacks
    "input[placeholder*='TOTP/OTP']",
    "input[placeholder*='OTP']",
    "input[placeholder*='TOTP']",
    "input[name='otp']",
    "input[name='totp']",
    "input[name='2fa']",
    "input[id*='otp']",
    "input[id*='totp']",
    "input[type='text']:last-of-type",
    "xpath=//input[contains(@placeholder,'OTP') or contains(@placeholder,'TOTP') or contains(@name,'otp') or contains(@name,'totp') or contains(@name,'2fa')]",
  ],
  submit: [
    // Flatrade specific - Login button
    "button#sbmt",
    "button[id='sbmt']",
    // Generic fallbacks
    "button:has-text('Login')",
    "button:has-text('Sign in')",
    "button:has-text('Sign In')",
    "button[type='submit']",
    "input[type='submit']",
    "button.btn-primary",
    "button.primary",
    "button[class*='login']",
    "text=Login",
    "text=Sign in",
    "text=Sign In",
    "xpath=//button[contains(text(),'Login') or contains(text(),'Sign') or contains(text(),'login')]",
    "xpath=//input[@type='submit']",
    "xpath=//button[@type='submit']",
  ],
  successHints: ["token", "generated", "success", "logged in", "dashboard", "tradetron"],
  errorHints: [
    "invalid",
    "incorrect",
    "wrong",
    "error",
    "failed",
    "authentication failed",
    "login failed",
    "invalid credentials",
    "wrong password",
    "wrong dob",
    "invalid dob",
    "invalid date of birth",
    "dob is incorrect",
    "please enter correct",
    "try again",
    "unauthorized",
    "access denied",
  ],
} as const

export function mergeSelectors(
  userSelectors?: Partial<typeof defaultSelectors>
): typeof defaultSelectors {
  if (!userSelectors) return defaultSelectors

  return {
    username: userSelectors.username ?? defaultSelectors.username,
    password: userSelectors.password ?? defaultSelectors.password,
    totp: userSelectors.totp ?? defaultSelectors.totp,
    submit: userSelectors.submit ?? defaultSelectors.submit,
    successHints: userSelectors.successHints ?? defaultSelectors.successHints,
    errorHints: userSelectors.errorHints ?? defaultSelectors.errorHints,
  }
}

