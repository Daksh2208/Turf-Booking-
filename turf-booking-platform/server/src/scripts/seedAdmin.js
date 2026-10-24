import dotenv from 'dotenv'
import { connectDB, disconnectDB } from '../config/db.js'
import { User } from '../models/User.js'

// Load environment variables from .env
dotenv.config()

/**
 * Controlled script to seed the initial Administrator from environment variables
 */
const seedAdmin = async () => {
  try {
    console.log('🌱 Connecting to database to verify administrator provisioning...')
    await connectDB()

    const name = (process.env.ADMIN_NAME || 'Daksh Admin').trim()
    const email = (process.env.ADMIN_EMAIL || 'admin@turfbooking.com').toLowerCase().trim()
    const password = process.env.ADMIN_PASSWORD

    // 1. Validate inputs
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error('❌ Failed: ADMIN_EMAIL is invalid or missing.')
      process.exit(1)
    }

    if (!password || password.length < 8) {
      console.error('❌ Failed: ADMIN_PASSWORD must be provided and at least 8 characters long.')
      process.exit(1)
    }

    // 2. Check for existing user with this email
    const existingUser = await User.findOne({ email })

    if (existingUser) {
      // Rule 6: Fail clearly if the configured email already belongs to a customer
      if (existingUser.role === 'customer') {
        console.error(
          `❌ Refused to provision admin: Email "${email}" already belongs to an existing customer account.`
        )
        process.exit(1)
      }

      // If administrator already exists, sync password from ADMIN_PASSWORD
      existingUser.passwordHash = await User.hashPassword(password)
      existingUser.name = name
      existingUser.isActive = true
      await existingUser.save()
      console.log('====================================================')
      console.log(`✅ Administrator credentials updated for "${email}"!`)
      console.log('====================================================')
      return
    }

    // 3. Hash password using bcrypt
    const passwordHash = await User.hashPassword(password)

    // 4. Create verified administrator account
    const newAdmin = await User.create({
      name,
      email,
      passwordHash,
      role: 'admin',
      isActive: true,
    })

    console.log('====================================================')
    console.log('🎉 Administrator Provisioned Successfully!')
    console.log('====================================================')
    console.log(`👤 Name:   ${newAdmin.name}`)
    console.log(`📧 Email:  ${newAdmin.email}`)
    console.log(`🔑 Role:   ${newAdmin.role}`)
    console.log(`📅 Created: ${newAdmin.createdAt.toISOString()}`)
    console.log('====================================================')
  } catch (error) {
    console.error('❌ Error during administrator provisioning:', error.message)
    process.exit(1)
  } finally {
    await disconnectDB()
    process.exit(0)
  }
}

seedAdmin()
