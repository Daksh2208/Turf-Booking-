import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import { connectDB, disconnectDB } from '../config/db.js'
import { User } from '../models/user.model.js'

// Load environment variables from .env
dotenv.config()

const seedAdmin = async () => {
  try {
    console.log('🌱 Connecting to database to seed initial administrator...')
    await connectDB()

    const name = process.env.ADMIN_NAME || 'Daksh Admin'
    const email = (process.env.ADMIN_EMAIL || 'admin@turfbooking.com').toLowerCase().trim()
    const password = process.env.ADMIN_PASSWORD || 'Admin@12345'

    // Check if an account with this email already exists
    const existingUser = await User.findOne({ email })

    if (existingUser) {
      if (existingUser.role === 'admin') {
        console.log(`ℹ️  Admin account already exists for ${email}.`)
      } else {
        existingUser.role = 'admin'
        await existingUser.save()
        console.log(`✅ Existing account for ${email} upgraded to administrator role!`)
      }
      return
    }

    // Hash the password with bcrypt (10 rounds)
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create the admin user
    const newAdmin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      status: 'active',
    })

    console.log('====================================================')
    console.log('🎉 Administrator Account Created Successfully!')
    console.log('====================================================')
    console.log(`👤 Name:  ${newAdmin.name}`)
    console.log(`📧 Email: ${newAdmin.email}`)
    console.log(`🔑 Role:  ${newAdmin.role}`)
    console.log('====================================================')
  } catch (error) {
    console.error('❌ Error seeding administrator account:', error)
  } finally {
    await disconnectDB()
    process.exit(0)
  }
}

seedAdmin()
