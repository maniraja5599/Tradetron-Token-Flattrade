export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeApp } = await import('./lib/init')
    initializeApp().catch(console.error)
  }
}

