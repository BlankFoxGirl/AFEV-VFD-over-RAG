import mongoose, { type Document, Schema } from "mongoose";

export interface IVerifiedFact {
  text: string;
  category: string;
  source: string;
  createdAt: Date;
}

export interface IVerifiedFactDocument extends IVerifiedFact, Document {}

const VerifiedFactSchema = new Schema<IVerifiedFactDocument>({
  text: { type: String, required: true, index: true },
  category: { type: String, required: true },
  source: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const VerifiedFact =
  mongoose.models.VerifiedFact ??
  mongoose.model<IVerifiedFactDocument>("VerifiedFact", VerifiedFactSchema);

export default VerifiedFact;
