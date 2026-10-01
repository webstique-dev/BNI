import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    chapterName: {
      type: String,
      default: 'BNI Jubilant – Chennai CBD A',
    },
    defaultStartTime: {
      type: String,
      default: '08:00', // HH:mm in 24-hr format
    },
    graceMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    requirePhoneLast4OnSearch: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure single doc helper
settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      chapterName: 'BNI Jubilant – Chennai CBD A',
      defaultStartTime: '08:00',
      graceMinutes: 0,
      requirePhoneLast4OnSearch: true,
    });
  }
  return settings;
};

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
