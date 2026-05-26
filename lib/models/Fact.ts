import mongoose, { type Document, Schema } from "mongoose";

export interface IAnnotation {
  text: string;
  editedFactText: string | null;
  createdAt: Date;
}

export interface IFact {
  text: string;
  context: string;
  documentId: string;
  documentName: string;
  createdAt: Date;
  annotations: IAnnotation[];
  verificationStatus: "verified" | "unverified" | "none";
}

export interface IFactDocument extends IFact, Document {}

const AnnotationSchema = new Schema<IAnnotation>(
  {
    text: { type: String, required: true },
    editedFactText: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const FactSchema = new Schema<IFactDocument>({
  text: { type: String, required: true },
  context: { type: String, required: true },
  documentId: { type: String, required: true, index: true },
  documentName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  annotations: { type: [AnnotationSchema], default: [] },
  verificationStatus: {
    type: String,
    enum: ["verified", "unverified", "none"],
    default: "none",
  },
});

const Fact =
  mongoose.models.Fact ?? mongoose.model<IFactDocument>("Fact", FactSchema);

export default Fact;
