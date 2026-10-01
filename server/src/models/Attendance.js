import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      index: true,
    },
    meetingDate: {
      type: String, // 'YYYY-MM-DD'
      required: true,
      index: true,
    },
    checkInAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['present', 'late'],
      required: true,
      default: 'present',
    },
    method: {
      type: String,
      enum: ['device', 'phone', 'search', 'admin'],
      required: true,
      default: 'device',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// UNIQUE compound index so duplicate scans never create a second record
attendanceSchema.index({ memberId: 1, meetingDate: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
