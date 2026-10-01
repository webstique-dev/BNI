import { parse } from 'csv-parse/sync';
import Member from '../models/Member.js';
import Device from '../models/Device.js';
import Attendance from '../models/Attendance.js';
import { normalizePhone, isValidPhone } from '../utils/phone.js';

/**
 * GET /api/admin/members
 */
export async function getMembers(req, res, next) {
  try {
    const { search, isActive } = req.query;
    const filter = {};

    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
        { company: { $regex: escaped, $options: 'i' } },
        { category: { $regex: escaped, $options: 'i' } },
      ];
    }

    const members = await Member.find(filter).sort({ name: 1 }).lean();

    // Fetch device counts for each member
    const memberIds = members.map((m) => m._id);
    const deviceCounts = await Device.aggregate([
      { $match: { memberId: { $in: memberIds } } },
      { $group: { _id: '$memberId', count: { $sum: 1 } } },
    ]);

    const deviceCountMap = new Map();
    deviceCounts.forEach((d) => deviceCountMap.set(d._id.toString(), d.count));

    const enrichedMembers = members.map((m) => ({
      ...m,
      deviceCount: deviceCountMap.get(m._id.toString()) || 0,
    }));

    return res.status(200).json({
      success: true,
      total: enrichedMembers.length,
      members: enrichedMembers,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/members/:id
 */
export async function getMemberById(req, res, next) {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    const devices = await Device.find({ memberId: member._id }).sort({ lastUsedAt: -1 });

    return res.status(200).json({
      success: true,
      member,
      devices,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/members
 */
export async function createMember(req, res, next) {
  try {
    const { name, phone, company, category, isActive } = req.body;
    const normalizedPhone = normalizePhone(phone);

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Member name must be at least 2 characters long.',
      });
    }

    if (!normalizedPhone || !isValidPhone(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit mobile number.',
      });
    }

    const existing = await Member.findOne({ phone: normalizedPhone });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Member with phone number ${normalizedPhone} already exists (${existing.name}).`,
      });
    }

    const member = await Member.create({
      name: name.trim(),
      phone: normalizedPhone,
      company: company?.trim() || '',
      category: category?.trim() || '',
      isActive: isActive !== undefined ? isActive : true,
    });

    return res.status(201).json({
      success: true,
      message: 'Member added successfully.',
      member,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/members/:id
 */
export async function updateMember(req, res, next) {
  try {
    const { name, phone, company, category, isActive } = req.body;
    const member = await Member.findById(req.params.id);

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    if (name) member.name = name.trim();
    if (company !== undefined) member.company = company.trim();
    if (category !== undefined) member.category = category.trim();
    if (isActive !== undefined) member.isActive = isActive;

    if (phone) {
      const normalizedPhone = normalizePhone(phone);
      if (!isValidPhone(normalizedPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid 10-digit mobile number.',
        });
      }

      // Check uniqueness if changed
      if (normalizedPhone !== member.phone) {
        const existing = await Member.findOne({ phone: normalizedPhone });
        if (existing && existing._id.toString() !== member._id.toString()) {
          return res.status(409).json({
            success: false,
            message: `Phone number is already in use by ${existing.name}.`,
          });
        }
        member.phone = normalizedPhone;
      }
    }

    await member.save();

    return res.status(200).json({
      success: true,
      message: 'Member updated successfully.',
      member,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/members/:id/toggle-active
 */
export async function toggleMemberActive(req, res, next) {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    member.isActive = !member.isActive;
    await member.save();

    return res.status(200).json({
      success: true,
      message: `Member ${member.isActive ? 'activated' : 'deactivated'} successfully.`,
      member,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/members/:id
 */
export async function deleteMember(req, res, next) {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    await Attendance.deleteMany({ memberId: member._id });
    await Device.deleteMany({ memberId: member._id });
    await member.deleteOne();

    return res.status(200).json({
      success: true,
      message: `Member ${member.name} deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/members/:id/reset-devices
 * Clears all linked devices for a member
 */
export async function resetMemberDevices(req, res, next) {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    const result = await Device.deleteMany({ memberId: member._id });

    return res.status(200).json({
      success: true,
      message: `Cleared ${result.deletedCount} linked device(s) for ${member.name}.`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/members/import-csv
 * Supports file upload or raw CSV text in body
 */
export async function importMembersCsv(req, res, next) {
  try {
    let csvData = '';

    if (req.file) {
      csvData = req.file.buffer.toString('utf-8');
    } else if (req.body.csvText) {
      csvData = req.body.csvText;
    } else {
      return res.status(400).json({
        success: false,
        message: 'No CSV file or CSV text provided.',
      });
    }

    // Parse CSV
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (!records || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'The CSV file is empty or formatted incorrectly.',
      });
    }

    let addedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      // Match case-insensitively for headers: name / Name / Member Name, phone / Phone / Mobile
      const name = row.name || row.Name || row['Member Name'] || row['Full Name'] || '';
      const phone = row.phone || row.Phone || row.mobile || row.Mobile || row['Phone Number'] || '';
      const company = row.company || row.Company || row['Company Name'] || '';
      const category = row.category || row.Category || row['Classification'] || row['Business Category'] || '';

      const normalizedPhone = normalizePhone(phone);

      if (!name || name.length < 2) {
        skippedCount++;
        errors.push(`Row ${i + 2}: Invalid name "${name}"`);
        continue;
      }

      if (!normalizedPhone || !isValidPhone(normalizedPhone)) {
        skippedCount++;
        errors.push(`Row ${i + 2}: Invalid phone number "${phone}"`);
        continue;
      }

      try {
        const existing = await Member.findOne({ phone: normalizedPhone });
        if (existing) {
          skippedCount++;
          errors.push(`Row ${i + 2}: Phone ${normalizedPhone} already exists for ${existing.name}`);
        } else {
          await Member.create({
            name: name.trim(),
            phone: normalizedPhone,
            company: company.trim(),
            category: category.trim(),
            isActive: true,
          });
          addedCount++;
        }
      } catch (err) {
        errorCount++;
        errors.push(`Row ${i + 2}: ${err.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: `CSV Import complete. Added: ${addedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}.`,
      addedCount,
      skippedCount,
      errorCount,
      errors: errors.slice(0, 10), // Return top 10 errors if any
    });
  } catch (error) {
    next(error);
  }
}
