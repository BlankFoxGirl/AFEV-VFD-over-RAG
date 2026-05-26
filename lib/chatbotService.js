import { resolveVerificationStatus } from "@/lib/factVerificationService";

const VERIFICATION_FLAGS = {
  verified: "Verified",
  unverified: "Unverified",
};

export function buildBaseReply(userMessage) {
  return (
    `You asked: "${userMessage}". ` +
    "This is a placeholder response from the FactCheck assistant. " +
    "Connect an AI service for real fact-checked answers."
  );
}

export function appendStatusFlag(reply, verificationStatus) {
  const flag = VERIFICATION_FLAGS[verificationStatus];
  return flag ? `${reply} [${flag}]` : reply;
}

export async function processMessage(userMessage) {
  const reply = buildBaseReply(userMessage);
  const verification = await resolveVerificationStatus(userMessage);
  return {
    reply: appendStatusFlag(reply, verification.status),
    verificationStatus: verification.status,
  };
}
