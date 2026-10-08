import mongoose from 'mongoose';

const DEFAULT_STATIC_QR_KEY = 'bni-jubilant-official';

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
    qrKey: {
      type: String,
      default: DEFAULT_STATIC_QR_KEY,
      trim: true,
    },
    qrRotatedAt: {
      type: Date,
      default: Date.now,
    },
    qrSecurityEnabled: {
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
      qrKey: DEFAULT_STATIC_QR_KEY,
      qrRotatedAt: new Date(),
      qrSecurityEnabled: true,
    });
  } else if (!settings.qrKey) {
    settings.qrKey = DEFAULT_STATIC_QR_KEY;
    settings.qrRotatedAt = new Date();
    await settings.save();
  }
  return settings;
};

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;


