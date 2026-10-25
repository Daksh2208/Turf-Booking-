import puppeteer from 'puppeteer-core'
import path from 'path'
import fs from 'fs'

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

const SCREENSHOTS_DIR = path.resolve(process.cwd(), '../../screenshots')

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
}

async function capture() {
  console.log('Launching browser with:', CHROME_PATH)
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 },
  })

  try {
    // ==========================================
    // 1. PUBLIC & CUSTOMER CONTEXT
    // ==========================================
    const customerContext = await browser.createBrowserContext()
    const page = await customerContext.newPage()
    await page.setViewport({ width: 1440, height: 900 })

    // A. Landing Page
    console.log('Capturing Landing Page...')
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise((r) => setTimeout(r, 2000))
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_landing_page.png') })

    // B. Customer Registration Form
    console.log('Capturing Register Page...')
    await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise((r) => setTimeout(r, 1500))
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_customer_registration.png') })

    // C. Register demo customer to access protected discovery & booking
    console.log('Registering active customer session...')
    const demoEmail = `player_${Date.now()}@example.com`
    await page.type('input[placeholder*="John Doe"], input[name="name"], input#name', 'Rahul Sharma')
    await page.type('input[type="email"], input[placeholder*="example.com"]', demoEmail)
    const passwordInputs = await page.$$('input[type="password"]')
    if (passwordInputs.length >= 2) {
      await passwordInputs[0].type('Password@123')
      await passwordInputs[1].type('Password@123')
    }
    const checkbox = await page.$('input[type="checkbox"]')
    if (checkbox) await checkbox.click()
    const submitBtn = await page.$('button[type="submit"]')
    if (submitBtn) await submitBtn.click()
    await new Promise((r) => setTimeout(r, 3000))

    // D. Turf Discovery Page
    console.log('Capturing Turf Discovery...')
    await page.goto('http://localhost:5173/turfs', { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise((r) => setTimeout(r, 3000))
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_turf_discovery.png') })

    // E. Turf Detail & Live Slot Calendar
    console.log('Capturing Turf Detail & Live Slot Calendar...')
    await page.goto('http://localhost:5173/turfs/apex-thunder-arena', { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise((r) => setTimeout(r, 3000))
    // Scroll down to show the dynamic calendar slots and pricing panel
    await page.evaluate(() => window.scrollBy(0, 420))
    await new Promise((r) => setTimeout(r, 1500))
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_slot_booking_pricing.png') })

    // ==========================================
    // 2. ADMIN CONTEXT
    // ==========================================
    const adminContext = await browser.createBrowserContext()
    const adminPage = await adminContext.newPage()
    await adminPage.setViewport({ width: 1440, height: 900 })

    console.log('Logging in as Admin...')
    await adminPage.goto('http://localhost:5173/login', { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise((r) => setTimeout(r, 1500))
    await adminPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_admin_login.png') })

    await adminPage.type('input[type="email"]', 'admin@turfbooking.com')
    await adminPage.type('input[type="password"]', 'Admin@2026')
    const adminLoginBtn = await adminPage.$('button[type="submit"]')
    if (adminLoginBtn) await adminLoginBtn.click()
    await new Promise((r) => setTimeout(r, 4000))

    // F. Admin Dashboard
    console.log('Capturing Admin Dashboard...')
    await adminPage.goto('http://localhost:5173/admin/dashboard', { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise((r) => setTimeout(r, 3000))
    await adminPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_admin_dashboard.png') })

    // G. Admin Turfs Management
    console.log('Capturing Admin Turfs...')
    await adminPage.goto('http://localhost:5173/admin/turfs', { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise((r) => setTimeout(r, 3000))
    await adminPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_admin_turf_management.png') })

    // H. Admin Bookings Calendar
    console.log('Capturing Admin Bookings...')
    await adminPage.goto('http://localhost:5173/admin/bookings', { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise((r) => setTimeout(r, 3000))
    await adminPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_admin_bookings_calendar.png') })

    // I. Admin Blocked Slots (Maintenance & Tournaments)
    console.log('Capturing Admin Blocked Slots...')
    await adminPage.goto('http://localhost:5173/admin/blocked-slots', { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise((r) => setTimeout(r, 3000))
    await adminPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_admin_blocked_slots.png') })

    // J. Admin Business Settings & Taxes
    console.log('Capturing Admin Settings...')
    await adminPage.goto('http://localhost:5173/admin/settings', { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise((r) => setTimeout(r, 3000))
    await adminPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '10_admin_settings.png') })

    console.log('All screenshots captured successfully!')
  } catch (err) {
    console.error('Error during screenshot capture:', err)
  } finally {
    await browser.close()
  }
}

capture()
