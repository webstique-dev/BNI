import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema(
  {
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      default: 'Weekly Chapter Meeting',
    },
    startTime: {
      type: String,
      default: '08:00', // HH:mm in 24-hr format
    },
    graceMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },
  },
  {
    timestamps: true,
  }
);

const Meeting = mongoose.model('Meeting', meetingSchema);
export default Meeting;
