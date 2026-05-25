import mongoose, { type Document, Schema } from "mongoose";

export interface IFact {
  text: string;
  context: string;
  documentId: string;
  documentName: string;
  createdAt: Date;
}

export interface IFactDocument extends IFact, Document {}

const FactSchema = new Schema<IFactDocument>({
  text: { type: String, required: true },
  context: { type: String, required: true },
  documentId: { type: String, required: true, index: true },
  documentName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Fact =
  mongoose.models.Fact ?? mongoose.model<IFactDocument>("Fact", FactSchema);

export default Fact;
