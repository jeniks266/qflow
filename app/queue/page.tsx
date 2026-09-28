"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type Customer = {
  id: string;
  token: number;
  name: string;
  phone: string;
  organization: string;
  service: string;
  amount: number;
  status: "Waiting" | "Serving" | "Completed" | "Skipped";
};

export default function QueuePage() {
  const router = useRouter();

  const [organization, setOrganization] = useState("");
  const [service, setService] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");

  const [myToken, setMyToken] = useState<number | null>(null);
  const [registeredPhone, setRegisteredPhone] = useState("");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currentToken, setCurrentToken] = useState(0);

  const [joined, setJoined] = useState(false);
  const [notification, setNotification] = useState("");
  const [loading, setLoading] = useState(false);

  const notifiedStatesRef = useRef<Set<string>>(new Set());

  // Load organization and service from QR
  useEffect(() => {
    const orgId = localStorage.getItem("qflow-scanned-org");
    const queueId = localStorage.getItem("qflow-scanned-queue");

    if (!orgId || !queueId) {
      router.push("/");
      return;
    }

    const orgName = orgId
      .split("-")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join(" ");

    const queueName = queueId
      .split("-")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join(" ");

    setOrganization(orgName);
    setService(queueName);

    setName("");
    setPhone("");
    setAmount("");
    setMyToken(null);
    setRegisteredPhone("");
    setJoined(false);
    setNotification("");
  }, [router]);

  // Load customers from Supabase
  useEffect(() => {
    if (!organization || !service) {
      return;
    }

    const loadData = async () => {
      const { data, error } = await supabase
        .from("customers")
        .select(
          "id,name,phone,organization,service,token,amount,status"
        )
        .eq("organization", organization)
        .eq("service", service)
        .order("token", {
          ascending: true,
        });

      if (error) {
        console.error(
          "Supabase load error:",
          error.message
        );
        return;
      }

      if (data) {
        setCustomers(data as Customer[]);
      }

      // Get currently serving token for this service
      const { data: servingData } = await supabase
        .from("customers")
        .select("token")
        .eq("organization", organization)
        .eq("service", service)
        .eq("status", "Serving")
        .order("token", {
          ascending: false,
        })
        .limit(1);

      if (
        servingData &&
        servingData.length > 0
      ) {
        setCurrentToken(
          Number(servingData[0].token)
        );
      } else {
        // Temporary fallback to admin localStorage
        const savedCurrent =
          localStorage.getItem(
            "qflow-current-token"
          );

        if (savedCurrent) {
          setCurrentToken(
            Number(savedCurrent)
          );
        }
      }
    };

    loadData();

    const interval = setInterval(
      loadData,
      1000
    );

    return () => clearInterval(interval);
  }, [organization, service]);

  // Ask notification permission
  const enableNotifications = async () => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window
    ) {
      if (
        Notification.permission ===
        "default"
      ) {
        await Notification.requestPermission();
      }
    }
  };

  // Send browser notification
  const sendMemberNotification = (
    stateKey: string,
    title: string,
    body: string
  ) => {
    if (
      notifiedStatesRef.current.has(
        stateKey
      )
    ) {
      return;
    }

    notifiedStatesRef.current.add(
      stateKey
    );

    setNotification(body);

    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification(title, {
        body,
      });
    }
  };

  // Register member in Supabase
  const joinQueue = async () => {
    if (!name.trim()) {
      alert("Please enter your name.");
      return;
    }

    if (!phone.trim()) {
      alert(
        "Please enter your mobile number."
      );
      return;
    }

    const cleanPhone =
      phone.replace(/\D/g, "");

    if (cleanPhone.length !== 10) {
      alert(
        "Please enter a valid 10-digit mobile number."
      );
      return;
    }

    setLoading(true);

    await enableNotifications();

    try {
      // Get latest token for this organization + service
      const { data: latestCustomer, error: tokenError } =
        await supabase
          .from("customers")
          .select("token")
          .eq(
            "organization",
            organization
          )
          .eq("service", service)
          .order("token", {
            ascending: false,
          })
          .limit(1);

      if (tokenError) {
        console.error(tokenError);

        alert(
          `Unable to get token: ${tokenError.message}`
        );

        return;
      }

      const highestToken =
        latestCustomer &&
        latestCustomer.length > 0
          ? Number(
              latestCustomer[0].token
            )
          : 0;

      const newToken =
        highestToken + 1;

      // Insert customer into Supabase
      const { data: insertedCustomer, error: insertError } =
        await supabase
          .from("customers")
          .insert({
            name: name.trim(),
            phone: cleanPhone,
            organization: organization,
            service: service,
            token: newToken,
            amount:
              Number(amount) || 0,
            status: "Waiting",
          })
          .select()
          .single();

      if (insertError) {
        console.error(insertError);

        alert(
          `Registration failed: ${insertError.message}`
        );

        return;
      }

      if (!insertedCustomer) {
        alert(
          "Registration failed. Please try again."
        );

        return;
      }

      const newCustomer =
        insertedCustomer as Customer;

      // Update local screen immediately
      setCustomers((prev) => [
        ...prev,
        newCustomer,
      ]);

      setMyToken(newToken);

      setRegisteredPhone(
        cleanPhone
      );

      setJoined(true);

      setNotification(
        `You joined ${service}. Your token is ${newToken}.`
      );
    } catch (error) {
      console.error(error);

      alert(
        "Something went wrong while registering."
      );
    } finally {
      setLoading(false);
    }
  };

  // Find current member
  const myCustomer = customers.find(
    (customer) =>
      customer.token === myToken &&
      customer.phone ===
        registeredPhone &&
      customer.service === service
  );

  // Only this service's queue
  const serviceCustomers =
    customers.filter(
      (customer) =>
        customer.service === service
    );

  // People ahead
  const peopleAhead = myToken
    ? serviceCustomers.filter(
        (customer) =>
          customer.token < myToken &&
          customer.status ===
            "Waiting"
      ).length
    : 0;

  const estimatedMinutes =
    peopleAhead * 5;

  // Member-specific notifications
  useEffect(() => {
    if (
      !myToken ||
      !registeredPhone ||
      !myCustomer
    ) {
      return;
    }

    const memberKey =
      `${registeredPhone}-${myToken}`;

    // Your turn
    if (
      myCustomer.status === "Serving"
    ) {
      sendMemberNotification(
        `${memberKey}-serving`,
        "QFlow - Your Turn",
        `Token ${myToken}: Please proceed now.`
      );

      return;
    }

    // You're next
    if (
      myCustomer.status === "Waiting" &&
      peopleAhead === 1
    ) {
      sendMemberNotification(
        `${memberKey}-next`,
        "QFlow - You're Next",
        `Token ${myToken}: Please be ready.`
      );

      return;
    }

    // Completed
    if (
      myCustomer.status ===
      "Completed"
    ) {
      sendMemberNotification(
        `${memberKey}-completed`,
        "QFlow - Completed",
        `Token ${myToken}: Your service has been completed.`
      );
    }
  }, [
    myToken,
    registeredPhone,
    myCustomer,
    peopleAhead,
  ]);

  // Registration screen
  if (!joined) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">

        <div className="w-full max-w-md">

          <div className="mb-8 text-center">

            <p className="text-sm text-zinc-400 mb-2">
              {organization}
            </p>

            <h1 className="text-4xl font-bold">
              Join Queue
            </h1>

            <p className="text-zinc-400 mt-2">
              {service}
            </p>

          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">

            <label className="block text-sm text-zinc-400 mb-2">
              Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="Enter your name"
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 mb-5 outline-none focus:border-white"
            />

            <label className="block text-sm text-zinc-400 mb-2">
              Mobile Number
            </label>

            <input
              type="tel"
              value={phone}
              onChange={(e) =>
                setPhone(
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 10)
                )
              }
              placeholder="10-digit mobile number"
              maxLength={10}
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 mb-5 outline-none focus:border-white"
            />

            <label className="block text-sm text-zinc-400 mb-2">
              Amount
            </label>

            <input
              type="number"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value)
              }
              placeholder="Enter amount"
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 mb-6 outline-none focus:border-white"
            />

            <button
              onClick={joinQueue}
              disabled={loading}
              className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-zinc-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Registering..."
                : "Register & Get Token"}
            </button>

          </div>

        </div>

      </main>
    );
  }

  // Token screen
  return (
    <main className="min-h-screen bg-black text-white p-6">

      <div className="max-w-5xl mx-auto">

        <div className="flex justify-between items-center mb-8">

          <div>
            <p className="text-sm text-zinc-500">
              {organization}
            </p>

            <h1 className="text-3xl font-bold">
              {service}
            </h1>
          </div>

          <div className="text-right">
            <p className="text-xs text-zinc-500">
              Registered Member
            </p>

            <p className="text-sm">
              {name}
            </p>
          </div>

        </div>

        {/* Token */}

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center mb-6">

          <p className="text-zinc-400 mb-2">
            Your Token
          </p>

          <h2 className="text-7xl font-bold">
            {myToken}
          </h2>

          <p className="text-zinc-400 mt-4">
            Mobile: ******{registeredPhone.slice(-4)}
          </p>

        </div>

        {/* Queue information */}

        <div className="grid md:grid-cols-4 gap-4">

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-sm text-zinc-500">
              Current Token
            </p>

            <p className="text-3xl font-bold mt-2">
              {currentToken || "-"}
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-sm text-zinc-500">
              People Ahead
            </p>

            <p className="text-3xl font-bold mt-2">
              {peopleAhead}
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-sm text-zinc-500">
              Estimated Wait
            </p>

            <p className="text-3xl font-bold mt-2">
              {estimatedMinutes} min
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-sm text-zinc-500">
              Status
            </p>

            <p className="text-xl font-bold mt-3">
              {myCustomer?.status ||
                "Waiting"}
            </p>
          </div>

        </div>

        {/* Notification */}

        {notification && (
          <div className="mt-6 bg-zinc-900 border border-zinc-700 rounded-2xl p-5">

            <p className="text-xs text-zinc-500 mb-1">
              Notification
            </p>

            <p className="font-medium">
              {notification}
            </p>

          </div>
        )}

        {/* Live Queue Status */}

        <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">

          <h3 className="text-lg font-semibold mb-4">
            Live Queue Status
          </h3>

          {myCustomer?.status ===
          "Serving" ? (
            <div>
              <p className="text-xl font-bold">
                Your Turn
              </p>

              <p className="text-zinc-400 mt-1">
                Please proceed to the service counter.
              </p>
            </div>
          ) : myCustomer?.status ===
            "Completed" ? (
            <div>
              <p className="text-xl font-bold">
                Service Completed
              </p>

              <p className="text-zinc-400 mt-1">
                Thank you for using QFlow.
              </p>
            </div>
          ) : myCustomer?.status ===
            "Skipped" ? (
            <div>
              <p className="text-xl font-bold">
                Token Skipped
              </p>

              <p className="text-zinc-400 mt-1">
                Please contact the service counter.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xl font-bold">
                Waiting
              </p>

              <p className="text-zinc-400 mt-1">
                Please stay nearby. QFlow will notify you when your turn is approaching.
              </p>
            </div>
          )}

        </div>

      </div>

    </main>
  );
}