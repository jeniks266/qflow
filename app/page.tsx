"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";

export default function Home() {
  const router = useRouter();

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef(false);

  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();

        try {
          scannerRef.current.clear();
        } catch {}

        scannerRef.current = null;
      }
    } catch (err) {
      console.log("Scanner stop:", err);
    }

    setScanning(false);
  };

  const handleScan = async (decodedText: string) => {
    if (scannedRef.current) return;

    console.log("QR detected:", decodedText);

    const parts = decodedText.trim().split("|");

    if (
      parts.length < 4 ||
      parts[0] !== "QFLOW" ||
      parts[1] !== "JOIN"
    ) {
      setError(
        "This is not a valid QFlow QR code."
      );
      return;
    }

    const organizationId = parts[2];
    const queueId = parts[3];

    if (!organizationId || !queueId) {
      setError("Invalid QFlow QR code.");
      return;
    }

    scannedRef.current = true;

    setMessage("QR Verified ✓");
    setError("");

    localStorage.setItem(
      "qflow-scanned-org",
      organizationId
    );

    localStorage.setItem(
      "qflow-scanned-queue",
      queueId
    );

    await stopScanner();

    setTimeout(() => {
      router.push("/queue");
    }, 700);
  };

  const startScanner = async () => {
    setError("");
    setMessage("");
    scannedRef.current = false;

    setScanning(true);

    try {
      await new Promise((resolve) =>
        setTimeout(resolve, 300)
      );

      const scanner = new Html5Qrcode(
        "qflow-reader"
      );

      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: {
            width: 280,
            height: 280,
          },
          aspectRatio: 1,
        },
        async (decodedText) => {
          await handleScan(decodedText);
        },
        () => {
          // QR not detected yet
        }
      );
    } catch (err) {
      console.error(err);

      setScanning(false);

      setError(
        "Unable to start camera. Please allow camera permission and try again."
      );
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {});
      }
    };
  }, []);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-5">

      <div className="w-full max-w-md">

        {/* LOGO */}

        <div className="text-center mb-8">

          <div className="w-14 h-14 mx-auto rounded-2xl bg-white text-black flex items-center justify-center text-2xl font-black">
            Q
          </div>

          <h1 className="text-4xl font-bold mt-4">
            QFlow
          </h1>

          <p className="text-zinc-500 mt-2">
            Scan. Join. Track. Done.
          </p>

        </div>

        {/* SCANNER CARD */}

        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6">

          <h2 className="text-2xl font-bold text-center">
            Scan to Join
          </h2>

          <p className="text-zinc-500 text-sm text-center mt-2 mb-6">
            Scan the QFlow QR code provided by the organization.
          </p>

          {!scanning && (

            <button
              onClick={startScanner}
              className="w-full bg-white text-black py-4 rounded-xl font-bold hover:bg-zinc-200 transition"
            >
              Scan QR Code
            </button>

          )}

          {scanning && (

            <div>

              <div className="relative bg-black border border-zinc-700 rounded-2xl overflow-hidden">

                <div
                  id="qflow-reader"
                  className="w-full"
                />

              </div>

              <p className="text-center text-zinc-500 text-sm mt-4">
                Place the QR code inside the box
              </p>

              <button
                onClick={stopScanner}
                className="w-full mt-4 bg-zinc-800 py-3 rounded-xl font-semibold hover:bg-zinc-700"
              >
                Stop Scanner
              </button>

            </div>

          )}

          {message && (

            <div className="mt-5 bg-green-950 border border-green-800 text-green-400 rounded-xl p-4 text-center font-semibold">
              {message}
            </div>

          )}

          {error && (

            <div className="mt-5 bg-red-950 border border-red-800 text-red-400 rounded-xl p-4 text-center text-sm">
              {error}
            </div>

          )}

        </div>

        {/* FEATURES */}

        <div className="grid grid-cols-3 gap-3 mt-5">

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-center">
            <p className="font-semibold">
              Scan
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              QR
            </p>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-center">
            <p className="font-semibold">
              Join
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              Queue
            </p>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-center">
            <p className="font-semibold">
              Track
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              Live
            </p>
          </div>

        </div>

      </div>

    </main>
  );
}