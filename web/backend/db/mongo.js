import mongoose from 'mongoose';

const AuditSchema = new mongoose.Schema({
  shop: String,
  announcementText: String,
   createdAt: Date 
});

export const AnnouncementAudit = mongoose.model('AnnouncementAudit', AuditSchema);

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
}