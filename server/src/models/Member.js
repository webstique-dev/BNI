import mongoose from 'mongoose';
import { normalizePhone } from '../utils/phone.js';

const memberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Member name is required'],
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      set: (val) => normalizePhone(val) || val,
      index: true,
    },
    company: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for masked phone
memberSchema.virtual('maskedPhone').get(function () {
  if (!this.phone) return '';
  return '******' + this.phone.slice(-4);
});

// JSON transform to ensure virtuals are included and clean representation
memberSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Member = mongoose.model('Member', memberSchema);
export default Member;
