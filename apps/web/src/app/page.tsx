"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

type Mode = "official" | "rizz";

export default function Home() {
  const [mode, setMode] = useState<Mode>("official");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [place, setPlace] = useState("");

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function resetImage() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  }

  function switchMode(next: Mode) {
    setMode(next);
    resetImage();
    setPlace("");
    closeCamera();
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setResult(null);
    setFile(f);
    if (!f) {
      setPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function openCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      setCameraOpen(true);
      // Wait a tick for the <video> element to mount before attaching the stream.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setCameraError("Couldn't access your camera - try uploading a photo instead.");
    }
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    setResult(null);
    setPreview(canvas.toDataURL("image/jpeg", 0.92));
    canvas.toBlob(
      (blob) => {
        if (blob) setFile(new File([blob], "camera-capture.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
    closeCamera();
  }

  async function generate() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const imageBase64 = preview ? preview.split(",")[1] : undefined;
      const note = mode === "rizz" ? place.trim() : undefined;
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, note, imageBase64, mediaType: file?.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function copyResult() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const ready = Boolean(file);

  return (
    <div className="dot-grid relative min-h-screen overflow-hidden bg-[#fbeee0] text-[#14110f]">
      <span className="pointer-events-none absolute left-4 top-28 hidden text-6xl opacity-20 sm:block sm:rotate-[-10deg]">
        🙈
      </span>
      <span className="pointer-events-none absolute right-6 top-52 hidden text-5xl opacity-20 sm:block sm:rotate-[8deg]">
        📅
      </span>
      <span className="pointer-events-none absolute bottom-24 left-10 hidden text-6xl opacity-20 sm:block sm:rotate-[6deg]">
        🔥
      </span>
      <span className="pointer-events-none absolute bottom-40 right-16 hidden text-5xl opacity-20 sm:block sm:rotate-[-6deg]">
        ✉️
      </span>

      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <span className="font-display text-lg tracking-tight">Zhay Bhai AI</span>
        <a
          href="#generate"
          className="flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-bold uppercase tracking-wide text-white"
        >
          <span className="h-2 w-2 rounded-full bg-pink-500" /> let&apos;s cook →
        </a>
      </header>

      <main className="relative z-10 mx-auto max-w-2xl px-6 pb-32 pt-4 sm:px-10">
        <h1 className="font-display text-5xl leading-[0.95] tracking-tight sm:text-6xl">
          excuse <span className="bg-yellow-300 px-2">generator</span>
          <br /> &amp; rizz machine
        </h1>
        <p className="mt-4 max-w-md text-sm text-black/60">
          upload a screenshot, pick a mode, we cook. official mode drafts your decline
          email, la. rizz mode reads the pic and drops a line. straight through claude,
          nothing saved anywhere.
        </p>

        <div className="mt-8 inline-flex rounded-full border-2 border-black bg-white p-1">
          {(["official", "rizz"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`rounded-full px-5 py-2 text-sm font-bold transition-colors ${
                mode === m ? "bg-black text-white" : "text-black/70"
              }`}
            >
              {m === "official" ? "💼 official mode" : "🔥 rizz mode"}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-black/50">
          {mode === "official"
            ? "upload the meeting, we draft your dip. la."
            : "upload their pic, get an instant Bhutanese rizz line. no cap."}
        </p>

        <div
          id="generate"
          className="relative mt-6 rounded-3xl bg-black p-6 text-white sm:p-8"
        >
          <span className="pointer-events-none absolute left-4 top-4 h-5 w-5 border-l-2 border-t-2 border-pink-400" />
          <span className="pointer-events-none absolute right-4 top-4 h-5 w-5 border-r-2 border-t-2 border-pink-400" />
          <span className="pointer-events-none absolute bottom-4 left-4 h-5 w-5 border-b-2 border-l-2 border-white/30" />
          <span className="pointer-events-none absolute bottom-4 right-4 h-5 w-5 border-b-2 border-r-2 border-white/30" />

          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-white/50">
            <span>{mode === "official" ? "official mode" : "rizz mode"}</span>
            <span>claude vision</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onFile}
            className="hidden"
          />
          <canvas ref={canvasRef} className="hidden" />

          <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 py-8">
            {cameraOpen ? (
              <div className="flex w-full flex-col items-center gap-4">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="max-h-72 w-full rounded-2xl border border-white/20 object-cover"
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-lg transition-transform active:scale-90"
                    aria-label="Capture photo"
                  >
                    <span className="h-10 w-10 rounded-full border-4 border-black" />
                  </button>
                  <button
                    type="button"
                    onClick={closeCamera}
                    className="rounded-full border border-white/30 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white/70"
                  >
                    cancel
                  </button>
                </div>
              </div>
            ) : !preview ? (
              <>
                {mode === "rizz" ? (
                  <div className="grid w-full grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={openCamera}
                      className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-[#fbeee0] py-8 font-bold text-black transition-transform active:scale-95"
                    >
                      <CameraIcon /> scan with camera →
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-white/30 py-8 font-bold text-white transition-colors hover:bg-white/5"
                    >
                      <UploadIcon /> upload photo
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl bg-[#fbeee0] py-10 font-bold text-black transition-transform active:scale-95"
                  >
                    <UploadIcon /> upload screenshot
                  </button>
                )}
                {cameraError && <p className="text-xs text-pink-300">{cameraError}</p>}
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                  {mode === "official" ? "screenshots work best" : "any pic works"}
                </span>
              </>
            ) : (
              <div className="flex w-full flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="preview"
                  className="max-h-64 w-full rounded-2xl border border-white/20 object-contain"
                />
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold uppercase tracking-wide text-white/60 underline underline-offset-4"
                  >
                    upload different
                  </button>
                  {mode === "rizz" && (
                    <button
                      type="button"
                      onClick={openCamera}
                      className="text-xs font-bold uppercase tracking-wide text-white/60 underline underline-offset-4"
                    >
                      retake photo
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {mode === "rizz" && preview && !cameraOpen && (
            <div className="mb-4">
              <input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="psst, where's she from? (optional)"
                className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:border-pink-400"
              />
              <span className="mt-1.5 block font-mono text-[10px] uppercase tracking-widest text-white/30">
                tell us the dzongkhag, we build the pun. leave blank and we&apos;ll guess.
              </span>
            </div>
          )}

          <button
            onClick={generate}
            disabled={busy || !ready}
            className="w-full rounded-full bg-[#fbeee0] px-4 py-3 text-sm font-bold text-black transition-transform active:scale-95 disabled:opacity-30"
          >
            {busy
              ? "cooking…"
              : mode === "official"
                ? "generate excuse email →"
                : "generate rizz line →"}
          </button>
          {error && <p className="mt-2 text-center text-xs text-pink-300">{error}</p>}
        </div>

        {result && (
          <div className="animate-pop-in mt-6 rounded-3xl border-2 border-black bg-white p-6">
            <span className="inline-block rounded-full bg-black px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white">
              {mode === "official" ? "your excuse, served" : "certified rizz"}
            </span>
            <p className="mt-4 whitespace-pre-wrap font-mono text-sm leading-relaxed">
              {result}
            </p>
            <button
              onClick={copyResult}
              className="mt-4 rounded-full border-2 border-black px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors hover:bg-black hover:text-white"
            >
              {copied ? "copied ✓" : "copy that"}
            </button>
          </div>
        )}
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-6">
        <button
          onClick={generate}
          disabled={busy || !ready}
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-black px-5 py-3 text-xs font-bold uppercase tracking-wide text-white shadow-xl transition-transform active:scale-95 disabled:opacity-40"
        >
          <span className={`h-2 w-2 rounded-full ${ready ? "bg-pink-500" : "bg-white/30"}`} />
          {busy ? "cooking…" : mode === "official" ? "cook the excuse" : "cook the rizz"} →
        </button>
      </div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 16V4m0 0L7 9m5-5l5 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        d="M4 8a2 2 0 012-2h1.5l1-1.5h7l1 1.5H18a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
