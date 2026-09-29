import { createHash, randomInt, randomUUID } from "node:crypto";
import { z } from "zod";
import { AGENCY_DIRECTORY } from "@shared/agencyDirectory";
import { TRPCError } from "@trpc/server";
import { createComplaint, createOtpChallenge, findComplaint, findOtpChallenge, updateOtpChallenge } from "./db";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { sendComplaintNotifications, sendSmsMessage } from "./_core/complaintNotifications";

const OTP_TTL_MS = 2 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

type MemoryOtp = {
  phoneHash: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
  verifiedAt?: number;
};
type MemoryComplaint = {
  trackingId: string;
  agencyIndex: number;
  agencyName: string;
  stateOrUt?: string;
  status: string;
  createdAt: number;
};
const memoryOtps = new Map<string, MemoryOtp>();
const memoryComplaints = new Map<string, MemoryComplaint>();

const normalizePhone = (phone: string) => phone.replace(/\D/g, "").slice(-10);
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const phoneSchema = z.string().transform(normalizePhone).refine(value => /^\d{10}$/.test(value), "Enter a valid 10-digit mobile number.");
const recommendationInput = z.object({
  problem: z.string().min(20).max(12000),
  stateOrUt: z.string().max(128).optional(),
});
const detailsSchema = z.record(z.string(), z.string().max(5000));
const complaintInput = z.object({
  anonymous: z.boolean(),
  phone: z.string().optional(),
  otpChallengeId: z.string().uuid().optional(),
  agencyIndex: z.number().int().min(0).max(AGENCY_DIRECTORY.length - 1),
  stateOrUt: z.string().max(128).optional(),
  details: detailsSchema,
});

function directoryBrief() {
  return AGENCY_DIRECTORY.map((agency, index) => [
    index,
    agency.bodyName,
    agency.level,
    agency.stateOrUt,
    agency.jurisdiction,
    agency.functions,
  ].join(" | ")).join("\n");
}

function redactSensitive(text: string) {
  return text
    .replace(/\b\d{10}\b/g, "[phone removed]")
    .replace(/\b\d{6}\b/g, "[otp removed]")
    .replace(/\b(?:pan|voter|driving licence|id number)\s*[:#-]?\s*[a-z0-9-]{4,}\b/gi, "[identity value removed]");
}

function parseModelJson(content: string): unknown {
  const cleaned = content.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI returned no JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function normalizeRecommendation(value: unknown) {
  const item = value as Record<string, unknown>;
  const index = Number(item.directoryIndex);
  if (!Number.isInteger(index) || index < 0 || index >= AGENCY_DIRECTORY.length) throw new Error("AI returned an invalid directory record");
  const steps = Array.isArray(item.steps) ? item.steps.filter(x => typeof x === "string").slice(0, 6) : [];
  const tips = Array.isArray(item.tips) ? item.tips.filter(x => typeof x === "string").slice(0, 4) : [];
  return {
    directoryIndex: index,
    reason: typeof item.reason === "string" ? item.reason.slice(0, 900) : "This body matches the jurisdiction and type of problem described.",
    urgent: item.urgent === true,
    steps,
    tips,
  };
}

function deterministicRecommendation(problem: string, stateOrUt?: string) {
  const text = `${problem} ${stateOrUt ?? ""}`.toLowerCase();
  let best = 4;
  let score = -1;
  AGENCY_DIRECTORY.forEach((agency, index) => {
    const haystack = `${agency.bodyName} ${agency.level} ${agency.stateOrUt} ${agency.jurisdiction} ${agency.functions}`.toLowerCase();
    let current = 0;
    for (const token of haystack.split(/[^a-z0-9]+/).filter(word => word.length > 3)) if (text.includes(token)) current += 1;
    if (stateOrUt && agency.stateOrUt.toLowerCase() === stateOrUt.toLowerCase()) current += 8;
    if (agency.level === "National" && /central|union|psu|public sector bank|minister|mp|nationwide/.test(text)) current += 6;
    if (/money laundering|pmla|fema/.test(text) && /enforcement directorate/.test(haystack)) current += 10;
    if (/delay|no response|grievance|pending/.test(text) && /cpgrams/.test(haystack)) current += 10;
    if (current > score) { score = current; best = index; }
  });
  if (/minister|\bmp\b|union minister/.test(text)) best = AGENCY_DIRECTORY.findIndex(item => /Lokpal of India/.test(item.bodyName));
  if (/money laundering|pmla|fema/.test(text)) best = AGENCY_DIRECTORY.findIndex(item => /Enforcement Directorate/.test(item.bodyName));
  const agency = AGENCY_DIRECTORY[best];
  return {
    directoryIndex: best,
    reason: "Matched against the supplied Anti-Corruption Bodies India directory because the managed AI service was unavailable.",
    urgent: /happening now|right now|just paid|danger/.test(text),
    steps: [
      `Open the official website for ${agency.bodyName}.`,
      "Choose the complaint, vigilance, grievance or online filing option that matches your incident.",
      "Keep your incident date, office details, contact information and supporting evidence ready.",
      "Submit only after reviewing the facts, then save the acknowledgement or reference number.",
    ],
    tips: ["Preserve messages, screenshots, receipts and reference numbers.", "Use facts and approximate dates rather than assumptions."],
  };
}

async function askManagedModel(problem: string, stateOrUt?: string) {
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) throw new Error("Managed AI runtime is not configured");
  const system = `You are a careful Indian anti-corruption routing assistant. Select exactly one directoryIndex from the supplied workbook records. Never invent an agency, website, helpline, or contact. Return JSON only in this shape: {"directoryIndex":0,"reason":"one or two plain sentences","urgent":false,"steps":["3 to 6 action sentences without URLs"],"tips":["up to 4 evidence items"]}. Use urgent=true if the demand is happening now, a person is in danger, or money was just sent online. Prefer the matching state/UT body for a state/local official; use national bodies for central officials, MPs, Union Ministers, PSUs, public-sector banks, money laundering, or nationwide grievances. Do not repeat or expose phone numbers, OTPs or identity numbers. Workbook records:\n${directoryBrief()}`;
  const response = await fetch(`${ENV.forgeApiUrl.replace(/\/+$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ENV.forgeApiKey}` },
    body: JSON.stringify({
      model: "gpt-5-mini",
      temperature: 0,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `State/UT: ${stateOrUt || "not provided"}\nProblem:\n${redactSensitive(problem)}` },
      ],
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload?.error?.message === "string" ? payload.error.message : `AI HTTP ${response.status}`);
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("AI returned an empty response");
  return normalizeRecommendation(parseModelJson(content));
}

async function deliverSms(phone: string, code: string) {
  return sendSmsMessage(phone, `Rishwat Mukt Bharat verification code: ${code}. It expires in 2 minutes.`);
}

async function verifiedChallenge(challengeId: string, phone: string) {
  const phoneHash = hash(phone);
  const memory = memoryOtps.get(challengeId);
  if (memory) return memory.phoneHash === phoneHash && Boolean(memory.verifiedAt) && memory.expiresAt > Date.now();
  const item = await findOtpChallenge(challengeId, phoneHash);
  return Boolean(item?.verifiedAt && item.expiresAt.getTime() > Date.now());
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  assistant: router({
    recommend: publicProcedure.input(recommendationInput).mutation(async ({ input }) => {
      try {
        return await askManagedModel(input.problem, input.stateOrUt);
      } catch (error) {
        console.warn("[Assistant] Using workbook fallback:", error instanceof Error ? error.message : error);
        return deterministicRecommendation(input.problem, input.stateOrUt);
      }
    }),
    officerAbove: publicProcedure.input(z.object({ designation: z.string().min(1), department: z.string().optional(), stateOrUt: z.string().optional(), facts: z.string().optional() })).mutation(async ({ input }) => {
      const fallback = Object.entries({ clerk: "Section Officer / Office Superintendent", assistant: "Section Officer", inspector: "Deputy Superintendent of Police", "sub-inspector": "Inspector", constable: "Head Constable", tehsildar: "Sub-Divisional Magistrate", patwari: "Naib Tehsildar", engineer: "Executive Engineer", "junior engineer": "Assistant Engineer", officer: "Department Head / Controlling Officer", agent: "Supervising Officer of the concerned department" }).find(([key]) => input.designation.toLowerCase().includes(key))?.[1] ?? "Immediate supervisory officer / controlling authority";
      if (!ENV.forgeApiUrl || !ENV.forgeApiKey) return { designation: input.designation, above: fallback, confidence: "guidance" as const, explanation: "The suggested rank is based on the designation supplied. Verify the department's published hierarchy." };
      try {
        const response = await fetch(`${ENV.forgeApiUrl.replace(/\/+$/, "")}/v1/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${ENV.forgeApiKey}` }, body: JSON.stringify({ model: "gpt-5-mini", temperature: 0, messages: [{ role: "system", content: "You identify the immediate official rank directly above a named Indian government official. Return JSON only: {\"above\":\"...\",\"explanation\":\"...\"}. Use the supplied department/state/facts, never invent a person's name, keep the answer a rank or controlling authority, and clearly say when hierarchy varies." }, { role: "user", content: `Designation: ${input.designation}\nDepartment: ${input.department || "not provided"}\nState/UT: ${input.stateOrUt || "not provided"}\nComplaint facts: ${redactSensitive(input.facts || "not provided")}` }] }) });
        const payload = await response.json().catch(() => ({}));
        const parsed = parseModelJson(payload?.choices?.[0]?.message?.content || "{}") as { above?: unknown; explanation?: unknown };
        if (typeof parsed?.above === "string" && parsed.above.trim()) return { designation: input.designation, above: parsed.above.trim(), confidence: "ai" as const, explanation: typeof parsed.explanation === "string" ? parsed.explanation : "Verify the hierarchy on the department's official website." };
      } catch (error) { console.warn("[Assistant] Officer hierarchy fallback:", error instanceof Error ? error.message : error); }
      return { designation: input.designation, above: fallback, confidence: "guidance" as const, explanation: "The suggested rank is based on the designation supplied. Verify the department's published hierarchy." };
    }),
  }),
  phone: router({
    sendOtp: publicProcedure.input(z.object({ phone: phoneSchema })).mutation(async ({ input }) => {
      const code = String(randomInt(100000, 1000000));
      const challengeId = randomUUID();
      const phoneHash = hash(input.phone);
      const codeHash = hash(code);
      const expiresAt = new Date(Date.now() + OTP_TTL_MS);
      let sent = false;
      try {
        sent = await deliverSms(input.phone, code);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "SMS delivery failed. Please try again later." });
      }
      const stored = await createOtpChallenge({ id: challengeId, phoneHash, codeHash, expiresAt, attempts: 0 });
      if (!stored) memoryOtps.set(challengeId, { phoneHash, codeHash, expiresAt: expiresAt.getTime(), attempts: 0 });
      return { challengeId, delivery: sent ? "sms" as const : "demo" as const, demoCode: undefined, expiresInSeconds: OTP_TTL_MS / 1000 };
    }),
    verifyOtp: publicProcedure.input(z.object({ challengeId: z.string().uuid(), phone: phoneSchema, code: z.string().regex(/^\d{6}$/) })).mutation(async ({ input }) => {
      const phoneHash = hash(input.phone);
      const codeHash = hash(input.code);
      const memory = memoryOtps.get(input.challengeId);
      if (memory) {
        if (memory.phoneHash !== phoneHash || memory.expiresAt <= Date.now() || memory.attempts >= MAX_OTP_ATTEMPTS) throw new TRPCError({ code: "BAD_REQUEST", message: "This OTP is expired or unavailable. Request a new code." });
        memory.attempts += 1;
        if (memory.codeHash !== codeHash) throw new TRPCError({ code: "BAD_REQUEST", message: "That OTP is not correct." });
        memory.verifiedAt = Date.now();
        return { verified: true };
      }
      const challenge = await findOtpChallenge(input.challengeId, phoneHash);
      if (!challenge || challenge.attempts >= MAX_OTP_ATTEMPTS) throw new TRPCError({ code: "BAD_REQUEST", message: "This OTP is expired or unavailable. Request a new code." });
      await updateOtpChallenge(input.challengeId, { attempts: challenge.attempts + 1 });
      if (challenge.codeHash !== codeHash) throw new TRPCError({ code: "BAD_REQUEST", message: "That OTP is not correct." });
      await updateOtpChallenge(input.challengeId, { verifiedAt: new Date() });
      return { verified: true };
    }),
  }),
  complaints: router({
    submit: publicProcedure.input(complaintInput).mutation(async ({ input }) => {
      const agency = AGENCY_DIRECTORY[input.agencyIndex];
      if (!agency) throw new TRPCError({ code: "BAD_REQUEST", message: "Select a valid directory-backed agency." });
      let phoneHash: string | undefined;
      if (!input.anonymous) {
        if (!input.phone || !input.otpChallengeId) throw new TRPCError({ code: "BAD_REQUEST", message: "Verify your mobile number before submitting." });
        const phone = normalizePhone(input.phone);
        if (!/^\d{10}$/.test(phone) || !(await verifiedChallenge(input.otpChallengeId, phone))) throw new TRPCError({ code: "BAD_REQUEST", message: "Verify your mobile number before submitting." });
        phoneHash = hash(phone);
      }
      const trackingId = `RMB-2026-${String(randomInt(100000, 1000000))}`;
      const record = { trackingId, anonymous: input.anonymous ? 1 : 0, phoneHash, agencyIndex: input.agencyIndex, agencyName: agency.bodyName, stateOrUt: input.stateOrUt, payload: JSON.stringify(input.details), status: "received" };
      const stored = await createComplaint(record);
      if (!stored) memoryComplaints.set(trackingId, { trackingId, agencyIndex: input.agencyIndex, agencyName: agency.bodyName, stateOrUt: input.stateOrUt, status: "received", createdAt: Date.now() });
      const phone = input.anonymous ? undefined : normalizePhone(input.phone ?? "");
      const email = input.anonymous ? undefined : input.details.rmail;
      if (phone || email) {
        void sendComplaintNotifications({ trackingId, agencyName: agency.bodyName, phone, email }).catch(error => console.warn("[Complaint notification] Queue failed:", error));
      }
      return { trackingId, agencyName: agency.bodyName, status: "received" as const, notificationsQueued: Boolean(phone || email) };
    }),
    track: publicProcedure.input(z.object({ trackingId: z.string().trim().toUpperCase().min(8).max(32) })).query(async ({ input }) => {
      const memory = memoryComplaints.get(input.trackingId);
      if (memory) return { found: true, trackingId: memory.trackingId, agencyName: memory.agencyName, status: memory.status, log: ["Complaint received", `Recommended destination: ${memory.agencyName}`] };
      const item = await findComplaint(input.trackingId);
      if (!item) return { found: false as const };
      return { found: true, trackingId: item.trackingId, agencyName: item.agencyName, status: item.status, log: ["Complaint received", `Recommended destination: ${item.agencyName}`] };
    }),
  }),
});

export type AppRouter = typeof appRouter;
