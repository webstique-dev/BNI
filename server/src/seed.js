import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './config/db.js';
import Admin from './models/Admin.js';
import Member from './models/Member.js';
import Settings from './models/Settings.js';
import Meeting from './models/Meeting.js';
import { getKolkataToday } from './utils/time.js';

const SAMPLE_MEMBERS = [
  {
    name: 'Ramesh Kumar',
    phone: '9840112345',
    company: 'Apex Chartered Accountants',
    category: 'Chartered Accountant',
  },
  {
    name: 'Priya Sundaram',
    phone: '9840223456',
    company: 'Sundaram Legal Associates',
    category: 'Corporate Lawyer',
  },
  {
    name: 'Karthik Rajan',
    phone: '9840334567',
    company: 'Zenith Interior Architects',
    category: 'Interior Designer',
  },
  {
    name: 'Deepa Venkatesh',
    phone: '9840445678',
    company: 'Venkatesh Digital Studio',
    category: 'Digital Marketing & SEO',
  },
  {
    name: 'Suresh Balaji',
    phone: '9840556789',
    company: 'Balaji Wealth & Financial Planners',
    category: 'Financial Advisor',
  },
  {
    name: 'Ananya Swaminathan',
    phone: '9840667890',
    company: 'Aura Event Creations',
    category: 'Event Planner',
  },
  {
    name: 'Vijay Anand',
    phone: '9840778901',
    company: 'Anand Commercial Real Estate',
    category: 'Real Estate Consultant',
  },
  {
    name: 'Meenakshi Iyer',
    phone: '9840889012',
    company: 'Iyer Print & Branding',
    category: 'Commercial Printing',
  },
  {
    name: 'Arvind Narayanan',
    phone: '9840990123',
    company: 'CloudMatrix IT Solutions',
    category: 'Software Development',
  },
  {
    name: 'Lakshmi Prabha',
    phone: '9840001234',
    company: 'Prabha Health & Wellness Centre',
    category: 'Wellness & Nutrition',
  },
  {
    name: 'Vignesh Raghavan',
    phone: '9884112233',
    company: 'Raghavan Electrical & Solar',
    category: 'Solar Energy Solutions',
  },
  {
    name: 'Shankar Mahadevan',
    phone: '9884223344',
    company: 'SM Logistics & Freight',
    category: 'Logistics & Shipping',
  },
];

export async function runSeed() {
  try {
    console.log('🌱 Starting BNI Jubilant Attendance Database Seed...');
    await connectDB();

    // 1. Seed / Update Admin
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'adminPassword123!';
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    let admin = await Admin.findOne({ username: adminUsername.toLowerCase() });
    if (admin) {
      admin.passwordHash = passwordHash;
      await admin.save();
      console.log(`✅ Admin updated: ${adminUsername}`);
    } else {
      admin = await Admin.create({
        username: adminUsername.toLowerCase(),
        passwordHash,
        name: 'Chapter Admin',
      });
      console.log(`✅ Admin created: ${adminUsername} (Password: ${adminPassword})`);
    }

    // 2. Seed / Update Settings
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        chapterName: 'BNI Jubilant – Chennai CBD A',
        defaultStartTime: '08:00',
        graceMinutes: 0,
        requirePhoneLast4OnSearch: true,
      });
      console.log('✅ Settings initialized (Start: 08:00 AM, Require Last 4: ON)');
    } else {
      console.log('ℹ️ Settings already exist');
    }

    // 3. Seed / Update Meeting for Today
    const today = getKolkataToday();
    let meeting = await Meeting.findOne({ date: today });
    if (!meeting) {
      meeting = await Meeting.create({
        date: today,
        title: 'Weekly Chapter Meeting',
        startTime: settings.defaultStartTime || '08:00',
        graceMinutes: settings.graceMinutes || 0,
        status: 'open',
      });
      console.log(`✅ Today's meeting initialized for ${today} at ${meeting.startTime}`);
    } else {
      console.log(`ℹ️ Today's meeting already exists for ${today}`);
    }

    // 4. Seed Members
    let addedCount = 0;
    let existingCount = 0;

    for (const memberData of SAMPLE_MEMBERS) {
      const existing = await Member.findOne({ phone: memberData.phone });
      if (!existing) {
        await Member.create({
          ...memberData,
          isActive: true,
        });
        addedCount++;
      } else {
        existingCount++;
      }
    }

    console.log(`✅ Members seeded: ${addedCount} added, ${existingCount} already existed.`);
    console.log('🎉 Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed error:', error);
  } finally {
    await disconnectDB();
  }
}

// If executed directly from CLI
if (process.argv[1]?.endsWith('seed.js')) {
  runSeed();
}
