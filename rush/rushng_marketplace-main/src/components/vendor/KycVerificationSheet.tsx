"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  ChevronLeft,
  GraduationCap,
  ShieldCheck,
  Mail,
  CheckCircle2,
  AlertCircle,
  Upload,
  X as XIcon,
  IdCard,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRush } from "@/lib/store";
import { useUploadFile } from "@/lib/hooks";
import {
  useSendInstitutionalOtp,
  useVerifyInstitutionalOtp,
  useSubmitExternalKyc,
} from "@/lib/kyc-hooks";
import { ApiError } from "@/lib/api-client";
import type { KycIdType, VendorKycPrivate } from "@/lib/types";

type Segment = "choice" | "student-email" | "student-otp" | "student-nin" | "external" | "done";

interface KycVerificationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kyc: VendorKycPrivate | null;
}

export function KycVerificationSheet({ open, onOpenChange, kyc }: KycVerificationSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Vendor verification</SheetTitle>
        </SheetHeader>
        {open && (
          <KycFlow key={kyc?.verificationTier ?? "fresh"} kyc={kyc} onDone={() => onOpenChange(false)} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function KycFlow({ kyc, onDone }: { kyc: VendorKycPrivate | null; onDone: () => void }) {
  const { pushToast } = useRush();

  const initialSegment: Segment =
    kyc?.kycStatus === "APPROVED"
      ? "done"
      : kyc?.kycStatus === "PENDING"
        ? "done"
        : "choice";

  const [segment, setSegment] = useState<Segment>(initialSegment);
  // Track whether the student just completed email OTP — if so, we
  // redirect them to the NIN upload step rather than straight to "done".
  const [studentEmail, setStudentEmail] = useState<string>("");

  function handleStudentVerified(email: string) {
    setStudentEmail(email);
    pushToast({ title: "Email verified! Now upload your NIN." });
    setSegment("student-nin");
  }

  return (
    <div className="px-4 pb-6 pt-2 space-y-4">
      {segment === "choice" && (
        <ChoiceScreen kyc={kyc} onPick={(seg) => setSegment(seg)} />
      )}

      {segment === "student-email" && (
        <StudentEmailScreen
          kyc={kyc}
          onBack={() => setSegment("choice")}
          onOtpSent={(email) => { setStudentEmail(email); setSegment("student-otp"); }}
        />
      )}

      {segment === "student-otp" && (
        <StudentOtpScreen
          kyc={kyc}
          email={studentEmail}
          onBack={() => setSegment("student-email")}
          onVerified={() => handleStudentVerified(studentEmail)}
        />
      )}

      {segment === "student-nin" && (
        <NinUploadScreen
          title="Upload your NIN"
          subtitle="As a verified LASU student, please also upload your National Identification Number (NIN) slip."
          onBack={() => setSegment("done")}
          onSubmitted={() => {
            pushToast({ title: "NIN uploaded! Badge is now active." });
            setSegment("done");
          }}
          isStudent={true}
        />
      )}

      {segment === "external" && (
        <NinUploadScreen
          title="NIN Verification"
          subtitle="Upload a clear photo of your NIN slip and enter your 11-digit NIN number. Our team will review it within 1-2 business days."
          onBack={() => setSegment("choice")}
          onSubmitted={() => {
            pushToast({ title: "Submitted for review" });
            setSegment("done");
          }}
          isStudent={false}
        />
      )}

      {segment === "done" && (
        <DoneScreen kyc={kyc} onDone={onDone} onReSubmit={() => setSegment("choice")} />
      )}
    </div>
  );
}

// ─── Choice screen ────────────────────────────────────────────────────────

function ChoiceScreen({
  kyc,
  onPick,
}: {
  kyc: VendorKycPrivate | null;
  onPick: (seg: Segment) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft leading-relaxed">
        Get the verified badge on your store. Choose the option that
        matches you — you can keep using Rush even if you skip this step,
        but unverified vendors are capped at 5 product listings.
      </p>

      {kyc?.kycStatus === "REJECTED" && kyc?.rejectionReason && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3 text-xs">
          <p className="font-bold text-destructive mb-1">Your last submission was rejected:</p>
          <p className="text-ink-soft">{kyc.rejectionReason}</p>
        </div>
      )}

      <ChoiceCard
        icon={<GraduationCap className="h-5 w-5" />}
        tone="blue"
        title="I'm a LASU student"
        body="Verify with your @st.lasu.edu.ng email (format: name.surname<matric>). Instant — just enter the code we send you, then upload your NIN."
        cta="Verify as student"
        onClick={() => onPick("student-email")}
      />

      <ChoiceCard
        icon={<ShieldCheck className="h-5 w-5" />}
        tone="green"
        title="Other Users"
        body="Upload your NIN slip and enter your 11-digit NIN number. Reviewed by Rush within 1-2 business days."
        cta="Submit NIN for review"
        onClick={() => onPick("external")}
      />
    </div>
  );
}

function ChoiceCard({
  icon, tone, title, body, cta, onClick,
}: {
  icon: React.ReactNode;
  tone: "blue" | "purple" | "green";
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
}) {
  const toneCls = {
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    purple: "bg-purple-50 text-purple-700 ring-purple-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  }[tone];

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl bg-card border border-border p-4 hover:border-rush/40 hover:shadow-card transition-all"
    >
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ring-1 shrink-0 ${toneCls}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink">{title}</p>
          <p className="text-xs text-ink-soft mt-1 leading-snug">{body}</p>
          <p className="text-xs font-semibold text-rush mt-2">{cta} →</p>
        </div>
      </div>
    </button>
  );
}

// ─── Student email screen ─────────────────────────────────────────────────

function StudentEmailScreen({
  kyc, onBack, onOtpSent,
}: {
  kyc: VendorKycPrivate | null;
  onBack: () => void;
  onOtpSent: (email: string) => void;
}) {
  const { pushToast } = useRush();
  const [email, setEmail] = useState(kyc?.institutionalEmail ?? "");
  const sendOtp = useSendInstitutionalOtp();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.endsWith("@st.lasu.edu.ng")) {
      pushToast({ title: "Invalid student email", description: "Student emails end in @st.lasu.edu.ng." });
      return;
    }
    // Check for the canonical name.surname<matric> local-part shape.
    const localPart = trimmed.split("@")[0] ?? "";
    if (!/^[a-z]+(?:-[a-z]+)*\.[a-z]+(?:-[a-z]+)*[0-9]{6,12}$/.test(localPart)) {
      const ok = window.confirm(
        "Your email doesn't look like the standard LASU student format " +
        "(name.surname<matric>@st.lasu.edu.ng, e.g. emeka.divine220591001@st.lasu.edu.ng). " +
        "Send the code anyway?"
      );
      if (!ok) return;
    }
    try {
      const res = await sendOtp.mutateAsync({ institutionalEmail: trimmed, role: "STUDENT" });
      pushToast({ title: "Code sent", description: `Check ${res.maskedEmail} (and spam folder).` });
      onOtpSent(trimmed);
    } catch (err: any) {
      pushToast({ title: "Couldn't send code", description: err instanceof ApiError ? err.message : undefined });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <BackRow onBack={onBack} title="Student verification" />
      <div className="rounded-xl bg-blue-50 ring-1 ring-blue-200 p-3 text-xs text-blue-800">
        <p className="flex items-center gap-1.5 font-semibold mb-1">
          <Mail className="h-3.5 w-3.5" /> Enter your LASU student email
        </p>
        <p>We'll send a 6-digit verification code to your school email.</p>
      </div>
      <Field label="Student email">
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="e.g. emeka.divine220591001@st.lasu.edu.ng"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={sendOtp.isPending}
        />
      </Field>
      <p className="text-[11px] text-ink-soft">
        Format: <code className="bg-muted px-1 py-0.5 rounded">name.surname&lt;matric&gt;@st.lasu.edu.ng</code>.
        Example: <code className="bg-muted px-1 py-0.5 rounded">emeka.divine220591001@st.lasu.edu.ng</code>.
      </p>
      <SheetFooter>
        <button
          type="submit"
          disabled={sendOtp.isPending || !email.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl rush-gradient text-white font-bold text-sm shadow-rush disabled:opacity-60"
        >
          {sendOtp.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Sending code…</>
          ) : (
            <><Mail className="h-4 w-4" /> Send verification code</>
          )}
        </button>
      </SheetFooter>
    </form>
  );
}

// ─── Student OTP screen ───────────────────────────────────────────────────

function StudentOtpScreen({
  kyc, email, onBack, onVerified,
}: {
  kyc: VendorKycPrivate | null;
  email: string;
  onBack: () => void;
  onVerified: () => void;
}) {
  const { pushToast } = useRush();
  const [otp, setOtp] = useState("");
  const verifyOtp = useVerifyInstitutionalOtp();
  const sendOtp = useSendInstitutionalOtp();

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) { pushToast({ title: "Enter the 6-digit code" }); return; }
    try {
      await verifyOtp.mutateAsync({ institutionalEmail: email, otp, role: "STUDENT" });
      onVerified();
    } catch (err: any) {
      pushToast({ title: "Verification failed", description: err instanceof ApiError ? err.message : undefined });
    }
  }

  async function handleResend() {
    if (!email) return;
    try {
      const res = await sendOtp.mutateAsync({ institutionalEmail: email, role: "STUDENT" });
      pushToast({ title: "New code sent", description: `Check ${res.maskedEmail}.` });
      setOtp("");
    } catch (err: any) {
      pushToast({ title: "Couldn't resend", description: err instanceof ApiError ? err.message : undefined });
    }
  }

  return (
    <form onSubmit={handleVerify} className="space-y-4">
      <BackRow onBack={onBack} title="Enter verification code" />
      <div className="rounded-xl bg-rush-soft/60 p-3 text-xs text-rush-deep">
        <p>We sent a 6-digit code to <strong>{email}</strong>. Enter it below.</p>
      </div>
      <Field label="Verification code">
        <Input
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="123456"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          className="text-center text-2xl tracking-[0.5em] font-bold"
          disabled={verifyOtp.isPending}
          autoFocus
        />
      </Field>
      <div className="flex items-center justify-between">
        <button type="button" onClick={handleResend} disabled={sendOtp.isPending}
          className="text-xs font-semibold text-rush disabled:opacity-50">
          {sendOtp.isPending ? "Sending…" : "Resend code"}
        </button>
        <span className="text-[11px] text-ink-soft">Code expires in 10 minutes</span>
      </div>
      <SheetFooter>
        <button type="submit" disabled={verifyOtp.isPending || otp.length !== 6}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl rush-gradient text-white font-bold text-sm shadow-rush disabled:opacity-60">
          {verifyOtp.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</>
          ) : (
            <><CheckCircle2 className="h-4 w-4" /> Verify email</>
          )}
        </button>
      </SheetFooter>
    </form>
  );
}

// ─── NIN Upload screen (shared by students + Other Users) ─────────────────

function NinUploadScreen({
  title,
  subtitle,
  onBack,
  onSubmitted,
  isStudent,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  onSubmitted: () => void;
  isStudent: boolean;
}) {
  const { user, pushToast } = useRush();
  const uploadMut = useUploadFile();
  const submitExternal = useSubmitExternalKyc();

  const [idCardUrl, setIdCardUrl] = useState<string>("");
  const [uploadingId, setUploadingId] = useState(false);
  const [uploadedFileSize, setUploadedFileSize] = useState<number>(0);
  const [ninNumber, setNinNumber] = useState("");
  const [residentialAddress, setResidentialAddress] = useState("");
  const [phone, setPhone] = useState(user?.phone ?? "");

  // Minimum image size (30KB) — a proxy for "clear enough". Images
  // below this are likely blurry screenshots or very low-res photos.
  const MIN_IMAGE_SIZE = 30 * 1024;

  async function handleIdUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side size check — reject tiny files (likely unclear).
    if (file.size < MIN_IMAGE_SIZE) {
      pushToast({
        title: "Image too small",
        description: `The photo is only ${(file.size / 1024).toFixed(0)}KB. Please take a clearer photo of your NIN slip (at least 30KB).`,
      });
      return;
    }

    setUploadingId(true);
    try {
      const res = await uploadMut.mutateAsync(file);
      setIdCardUrl(res.url);
      setUploadedFileSize(res.size);
      pushToast({ title: "NIN slip uploaded" });
    } catch (err: any) {
      pushToast({ title: "Upload failed", description: err?.message });
    } finally {
      setUploadingId(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idCardUrl) { pushToast({ title: "Upload your NIN slip first" }); return; }
    // Validate NIN number is 11 digits.
    const sanitizedNin = ninNumber.replace(/\D/g, "");
    if (sanitizedNin.length !== 11) {
      pushToast({ title: "Invalid NIN", description: "Your NIN must be exactly 11 digits." });
      return;
    }
    if (!isStudent) {
      // Other Users also need address + phone.
      if (residentialAddress.trim().length < 10) {
        pushToast({ title: "Enter your full residential address" }); return;
      }
      if (phone.replace(/\D/g, "").length < 11) {
        pushToast({ title: "Enter a valid Nigerian phone number" }); return;
      }
    }
    try {
      await submitExternal.mutateAsync({
        idCardUrl,
        idType: "NIN" as KycIdType,
        residentialAddress: isStudent ? "N/A (student)" : residentialAddress.trim(),
        phone: isStudent ? (user?.phone ?? "N/A") : phone.trim(),
        ninNumber: sanitizedNin,
      });
      onSubmitted();
    } catch (err: any) {
      pushToast({ title: "Submission failed", description: err instanceof ApiError ? err.message : undefined });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <BackRow onBack={onBack} title={title} />
      <p className="text-xs text-ink-soft leading-relaxed">{subtitle}</p>

      {/* NIN slip photo */}
      <Field label="NIN slip photo">
        {idCardUrl ? (
          <div className="relative rounded-xl overflow-hidden border border-border">
            <img src={idCardUrl} alt="NIN slip" className="w-full max-h-48 object-cover" />
            <button type="button" onClick={() => setIdCardUrl("")}
              className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/90 flex items-center justify-center shadow-sm">
              <XIcon className="h-4 w-4 text-destructive" />
            </button>
            {uploadedFileSize > 0 && (
              <p className="absolute bottom-2 left-2 text-[10px] bg-background/90 px-2 py-0.5 rounded">
                {(uploadedFileSize / 1024).toFixed(0)}KB ✓
              </p>
            )}
          </div>
        ) : (
          <label className="block">
            <div className="rounded-xl border-2 border-dashed border-border hover:border-rush hover:bg-rush-soft/40 transition-colors p-6 flex flex-col items-center gap-2 cursor-pointer">
              {uploadingId ? (
                <Loader2 className="h-6 w-6 animate-spin text-rush" />
              ) : (
                <Upload className="h-6 w-6 text-ink-soft" />
              )}
              <p className="text-xs font-semibold text-ink">
                {uploadingId ? "Uploading…" : "Tap to upload NIN slip photo"}
              </p>
              <p className="text-[10px] text-ink-soft">JPG/PNG/WebP · min 30KB · max 5MB</p>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleIdUpload} disabled={uploadingId} />
          </label>
        )}
      </Field>

      {/* NIN number input */}
      <Field label="NIN number (11 digits)">
        <div className="relative">
          <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
          <Input
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={11}
            placeholder="12345678901"
            value={ninNumber}
            onChange={(e) => setNinNumber(e.target.value.replace(/\D/g, ""))}
            className="pl-9 tracking-wider font-mono"
            disabled={submitExternal.isPending}
          />
        </div>
      </Field>

      {/* Additional fields for Other Users (not students) */}
      {!isStudent && (
        <>
          <Field label="Residential address">
            <Textarea
              placeholder="House number, street, area, city, state"
              value={residentialAddress}
              onChange={(e) => setResidentialAddress(e.target.value)}
              rows={2}
              required
              disabled={submitExternal.isPending}
            />
          </Field>
          <Field label="Phone number">
            <Input
              type="tel"
              inputMode="tel"
              placeholder="e.g. 08012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={submitExternal.isPending}
            />
          </Field>
        </>
      )}

      <SheetFooter>
        <button type="submit" disabled={submitExternal.isPending || !idCardUrl || ninNumber.length !== 11}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl rush-gradient text-white font-bold text-sm shadow-rush disabled:opacity-60">
          {submitExternal.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
          ) : (
            <><ShieldCheck className="h-4 w-4" /> {isStudent ? "Upload NIN" : "Submit for review"}</>
          )}
        </button>
      </SheetFooter>
    </form>
  );
}

// ─── Done screen ──────────────────────────────────────────────────────────

function DoneScreen({
  kyc, onDone, onReSubmit,
}: {
  kyc: VendorKycPrivate | null;
  onDone: () => void;
  onReSubmit: () => void;
}) {
  const isApproved = kyc?.kycStatus === "APPROVED";
  const isPending = kyc?.kycStatus === "PENDING";
  const isRejected = kyc?.kycStatus === "REJECTED";

  return (
    <div className="space-y-4">
      {isApproved && (
        <div className="text-center py-4">
          <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
          <h3 className="text-base font-bold text-ink">You're verified!</h3>
          <p className="text-sm text-ink-soft mt-1">
            Your store displays the
            {" "}
            {kyc?.verificationTier === "STUDENT_LASU" && "Verified LASU Student"}
            {kyc?.verificationTier === "COMMUNITY_EXTERNAL" && "ID-Verified Merchant"}
            {" "}
            badge. You have unlimited product listings and priority in search.
          </p>
        </div>
      )}
      {isPending && (
        <div className="text-center py-4">
          <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
            <Loader2 className="h-9 w-9 text-amber-600" />
          </div>
          <h3 className="text-base font-bold text-ink">Under review</h3>
          <p className="text-sm text-ink-soft mt-1">
            Your NIN has been submitted. Our team will review it within 1-2 business days.
          </p>
        </div>
      )}
      {isRejected && (
        <>
          <div className="text-center py-4">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="h-9 w-9 text-destructive" />
            </div>
            <h3 className="text-base font-bold text-ink">Submission rejected</h3>
            <p className="text-sm text-ink-soft mt-1">
              {kyc?.rejectionReason || "Your last submission couldn't be approved."}
            </p>
          </div>
          <button onClick={onReSubmit}
            className="w-full py-3 rounded-xl rush-gradient text-white font-bold text-sm shadow-rush">
            Re-submit verification
          </button>
        </>
      )}
      {(isApproved || isPending) && (
        <button onClick={onDone}
          className="w-full py-3 rounded-xl bg-card border border-border text-ink font-semibold text-sm">
          {isApproved ? "Done" : "Close"}
        </button>
      )}
    </div>
  );
}

// ─── Shared bits ──────────────────────────────────────────────────────────

function BackRow({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div className="flex items-center gap-2 -mt-1">
      <button onClick={onBack}
        className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center" aria-label="Back">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <p className="text-sm font-bold text-ink">{title}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink-soft mb-1.5">{label}</label>
      {children}
    </div>
  );
}
