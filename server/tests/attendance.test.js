import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import Member from '../src/models/Member.js';
import Meeting from '../src/models/Meeting.js';
import Settings from '../src/models/Settings.js';
import Attendance from '../src/models/Attendance.js';
import Device from '../src/models/Device.js';
import { calculateAttendanceStatus, getKolkataToday } from '../src/utils/time.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Initialize settings
  await Settings.create({
    chapterName: 'BNI Jubilant – Chennai CBD A',
    defaultStartTime: '08:00',
    graceMinutes: 0,
    requirePhoneLast4OnSearch: true,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Member.deleteMany({});
  await Attendance.deleteMany({});
  await Device.deleteMany({});
  await Meeting.deleteMany({});
});

describe('BNI Attendance Unit & Integration Tests', () => {
  // 1. Late Calculation Test
  describe('Late Calculation Logic', () => {
    test('marks present before 08:00 AM', () => {
      // 7:45 AM Asia/Kolkata
      const checkInDate = new Date('2026-10-01T02:15:00.000Z'); // 07:45 AM IST
      const status = calculateAttendanceStatus(checkInDate, '2026-10-01', '08:00', 0);
      expect(status).toBe('present');
    });

    test('marks present at exact 08:00 AM', () => {
      const checkInDate = new Date('2026-10-01T02:30:00.000Z'); // 08:00 AM IST
      const status = calculateAttendanceStatus(checkInDate, '2026-10-01', '08:00', 0);
      expect(status).toBe('present');
    });

    test('marks late after 08:00 AM when graceMinutes is 0', () => {
      const checkInDate = new Date('2026-10-01T02:31:00.000Z'); // 08:01 AM IST
      const status = calculateAttendanceStatus(checkInDate, '2026-10-01', '08:00', 0);
      expect(status).toBe('late');
    });

    test('respects grace minutes (e.g. 15 mins grace)', () => {
      const checkInDate = new Date('2026-10-01T02:40:00.000Z'); // 08:10 AM IST
      const status = calculateAttendanceStatus(checkInDate, '2026-10-01', '08:00', 15);
      expect(status).toBe('present');

      const lateDate = new Date('2026-10-01T02:46:00.000Z'); // 08:16 AM IST
      const lateStatus = calculateAttendanceStatus(lateDate, '2026-10-01', '08:00', 15);
      expect(lateStatus).toBe('late');
    });
  });

  // 2. New Phone Registration & Check-in Flow
  describe('Phone Check-In and New Member Registration Flow', () => {
    test('returns isNew: true when phone is unrecognized', async () => {
      const res = await request(app)
        .post('/api/checkin/phone')
        .send({ phone: '9840199999' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isNew).toBe(true);
      expect(res.body.phone).toBe('9840199999');
    });

    test('registers new member, creates attendance, and sets device cookie', async () => {
      const res = await request(app)
        .post('/api/checkin/register')
        .send({
          name: 'Arun Prakash',
          phone: '+91 98401 99999',
          company: 'Prakash Technologies',
          category: 'Software Consulting',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.member.name).toBe('Arun Prakash');
      expect(res.body.alreadyMarked).toBe(false);

      // Verify cookie header is set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/device_token=/);

      // Verify database records
      const savedMember = await Member.findOne({ phone: '9840199999' });
      expect(savedMember).not.toBeNull();
      expect(savedMember.name).toBe('Arun Prakash');

      const savedAttendance = await Attendance.findOne({ memberId: savedMember._id });
      expect(savedAttendance).not.toBeNull();
    });
  });

  // 3. Duplicate Scans / Idempotency Test
  describe('Duplicate Scan Idempotency', () => {
    test('second scan on the same date marks alreadyMarked: true without duplicate DB row', async () => {
      // Create member
      const member = await Member.create({
        name: 'Ramesh Kumar',
        phone: '9840112345',
        company: 'Apex CA',
      });

      // First check-in via phone
      const res1 = await request(app)
        .post('/api/checkin/phone')
        .send({ phone: '9840112345' });

      expect(res1.status).toBe(200);
      expect(res1.body.alreadyMarked).toBe(false);
      expect(res1.body.member.name).toBe('Ramesh Kumar');

      // Extract device cookie
      const cookie = res1.headers['set-cookie'];

      // Second check-in via device cookie
      const res2 = await request(app)
        .post('/api/checkin/device')
        .set('Cookie', cookie);

      expect(res2.status).toBe(200);
      expect(res2.body.alreadyMarked).toBe(true);
      expect(res2.body.member.name).toBe('Ramesh Kumar');

      // Check DB attendance count for this member
      const attendanceCount = await Attendance.countDocuments({ memberId: member._id });
      expect(attendanceCount).toBe(1);
    });
  });

  // 4. Member Search & Last 4 digits verification
  describe('Member Search and Verification', () => {
    test('public search returns only id and name (no phone number exposed)', async () => {
      await Member.create({
        name: 'Karthik Rajan',
        phone: '9840334567',
        company: 'Zenith Interior Architects',
      });

      const res = await request(app).get('/api/members/search?q=Karthik');
      expect(res.status).toBe(200);
      expect(res.body.results.length).toBe(1);
      expect(res.body.results[0].name).toBe('Karthik Rajan');
      expect(res.body.results[0].phone).toBeUndefined(); // Phone must NOT be exposed!
    });

    test('search check-in rejects incorrect last-4 digits', async () => {
      const member = await Member.create({
        name: 'Priya Sundaram',
        phone: '9840223456',
      });

      const res = await request(app)
        .post('/api/checkin/search')
        .send({
          memberId: member._id.toString(),
          phoneLast4: '9999', // Incorrect last 4 (correct is 3456)
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/do not match/i);
    });

    test('search check-in succeeds with correct last-4 digits', async () => {
      const member = await Member.create({
        name: 'Priya Sundaram',
        phone: '9840223456',
      });

      const res = await request(app)
        .post('/api/checkin/search')
        .send({
          memberId: member._id.toString(),
          phoneLast4: '3456',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.member.name).toBe('Priya Sundaram');
      expect(res.body.punctualityMessage).toBeDefined();
    });
  });

  // 5. Member Login Punctuality & Messages
  describe('Member Login Expected Time & Punctuality Messages', () => {
    test('displays early message when logging in before expected time', async () => {
      const { calculatePunctuality } = await import('../src/utils/time.js');
      // 07:50 AM IST
      const checkInDate = new Date('2026-10-01T02:20:00.000Z');
      const result = calculatePunctuality(checkInDate, '2026-10-01', '08:00');

      expect(result.punctuality).toBe('early');
      expect(result.message).toBe("Congratulations! You've arrived early. Thank you for being punctual. Keep it up!");
    });

    test('displays right on time message when logging in exactly at expected time', async () => {
      const { calculatePunctuality } = await import('../src/utils/time.js');
      // 08:00 AM IST
      const checkInDate = new Date('2026-10-01T02:30:00.000Z');
      const result = calculatePunctuality(checkInDate, '2026-10-01', '08:00');

      expect(result.punctuality).toBe('on_time');
      expect(result.message).toBe("Congratulations! You're right on time. Thank you for your punctuality!");
    });

    test('displays late message when logging in after expected time', async () => {
      const { calculatePunctuality } = await import('../src/utils/time.js');
      // 08:15 AM IST
      const checkInDate = new Date('2026-10-01T02:45:00.000Z');
      const result = calculatePunctuality(checkInDate, '2026-10-01', '08:00');

      expect(result.punctuality).toBe('late');
      expect(result.message).toBe("You're a little late today. No worries! Let's try to be on time tomorrow. Thank you!");
    });

    test('dynamically respects admin updated login time', async () => {
      const { calculatePunctuality } = await import('../src/utils/time.js');
      // 08:15 AM IST - when expected time is updated to 08:30 AM, 08:15 AM becomes early!
      const checkInDate = new Date('2026-10-01T02:45:00.000Z');
      const resultUpdated = calculatePunctuality(checkInDate, '2026-10-01', '08:30');

      expect(resultUpdated.punctuality).toBe('early');
      expect(resultUpdated.message).toBe("Congratulations! You've arrived early. Thank you for being punctual. Keep it up!");
    });
  });
});

