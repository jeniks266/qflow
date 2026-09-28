"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

type Customer = {
  token: number;
  name: string;
  service: string;
  amount: number;
  status: "Waiting" | "Serving" | "Completed" | "Skipped";
};

type Organization = {
  name: string;
  type: string;
};

const organizationQueues: Record<string, string[]> = {
  Hospital: ["OP Consultation", "Pharmacy", "Laboratory"],
  Library: ["Book Issue", "Book Return", "Membership"],
  Canteen: ["Food Order", "Pickup", "Billing"],
  Hotel: ["Reception", "Check-in", "Room Service"],
  Restaurant: ["Table Booking", "Food Order", "Billing"],
  Bank: ["Cash Counter", "Customer Service", "Loans"],
  College: ["Admission", "Office", "Certificate"],
  Salon: ["Haircut", "Spa", "Billing"],
  "Government Office": ["Enquiry", "Application", "Certificate"],
  Store: ["Billing", "Returns", "Customer Support"],
  Clinic: ["Doctor Consultation", "Pharmacy", "Billing"],
  "Cinema / Theatre": [
    "Ticket Booking",
    "Food Counter",
    "Enquiry",
  ],
  Airport: ["Check-in", "Customer Service", "Enquiry"],
  "Transport / Railway": [
    "Ticket Booking",
    "Enquiry",
    "Customer Service",
  ],
  Other: ["General Enquiry", "Customer Service", "Billing"],
};

const organizationTypes = Object.keys(organizationQueues);

export default function AdminPage() {
  const [organization, setOrganization] = useState<Organization>({
    name: "My Organization",
    type: "Hospital",
  });

  const [services, setServices] = useState<string[]>(
    organizationQueues.Hospital
  );

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currentToken, setCurrentToken] = useState(0);

  useEffect(() => {
    const savedOrg = localStorage.getItem("qflow-organization");
    const savedCustomers = localStorage.getItem("qflow-customers");
    const savedCurrent = localStorage.getItem("qflow-current-token");

    if (savedOrg) {
      const org = JSON.parse(savedOrg);

      setOrganization(org);

      setServices(
        organizationQueues[org.type] ||
          organizationQueues.Other
      );
    }

    if (savedCustomers) {
      setCustomers(JSON.parse(savedCustomers));
    }

    if (savedCurrent) {
      setCurrentToken(Number(savedCurrent));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "qflow-organization",
      JSON.stringify(organization)
    );

    localStorage.setItem(
      "qflow-customers",
      JSON.stringify(customers)
    );

    localStorage.setItem(
      "qflow-current-token",
      String(currentToken)
    );
  }, [organization, customers, currentToken]);

  useEffect(() => {
    const refreshData = () => {
      const savedCustomers =
        localStorage.getItem("qflow-customers");

      const savedCurrent =
        localStorage.getItem("qflow-current-token");

      if (savedCustomers) {
        setCustomers(JSON.parse(savedCustomers));
      }

      if (savedCurrent) {
        setCurrentToken(Number(savedCurrent));
      }
    };

    const interval = setInterval(refreshData, 1000);

    return () => clearInterval(interval);
  }, []);

  const changeOrganizationType = (type: string) => {
    const updatedOrganization = {
      ...organization,
      type,
    };

    setOrganization(updatedOrganization);

    setServices(
      organizationQueues[type] ||
        organizationQueues.Other
    );
  };

  const makeId = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const createQRValue = (service: string) => {
    const organizationId = makeId(organization.name);
    const queueId = makeId(service);

    return `QFLOW|JOIN|${organizationId}|${queueId}`;
  };

  const callNext = () => {
    const nextCustomer = customers.find(
      (customer) => customer.status === "Waiting"
    );

    if (!nextCustomer) {
      alert("No waiting customers.");
      return;
    }

    const updatedCustomers = customers.map(
      (customer) => {
        if (customer.token === nextCustomer.token) {
          return {
            ...customer,
            status: "Serving" as const,
          };
        }

        return customer;
      }
    );

    setCustomers(updatedCustomers);
    setCurrentToken(nextCustomer.token);
  };

  const completeCurrent = () => {
    const updatedCustomers = customers.map(
      (customer) => {
        if (
          customer.token === currentToken &&
          customer.status === "Serving"
        ) {
          return {
            ...customer,
            status: "Completed" as const,
          };
        }

        return customer;
      }
    );

    setCustomers(updatedCustomers);
  };

  const skipCurrent = () => {
    const updatedCustomers = customers.map(
      (customer) => {
        if (
          customer.token === currentToken &&
          customer.status === "Serving"
        ) {
          return {
            ...customer,
            status: "Skipped" as const,
          };
        }

        return customer;
      }
    );

    setCustomers(updatedCustomers);
  };

  const waitingCount = customers.filter(
    (customer) => customer.status === "Waiting"
  ).length;

  const completedCount = customers.filter(
    (customer) => customer.status === "Completed"
  ).length;

  const servingCount = customers.filter(
    (customer) => customer.status === "Serving"
  ).length;

  const totalAmount = customers.reduce(
    (total, customer) =>
      total + Number(customer.amount || 0),
    0
  );

  return (
    <main className="min-h-screen bg-black text-white">

      {/* HEADER */}

      <header className="border-b border-zinc-800 bg-zinc-950">

        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          <div>
            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-black text-xl">
                Q
              </div>

              <div>
                <h1 className="text-2xl font-bold">
                  QFlow
                </h1>

                <p className="text-xs text-zinc-500">
                  Universal Queue Management
                </p>
              </div>

            </div>
          </div>

          <div className="text-left md:text-right">

            <p className="text-xs text-zinc-500 uppercase tracking-wider">
              Current Token
            </p>

            <p className="text-4xl font-bold">
              {currentToken
                ? `#${currentToken}`
                : "--"}
            </p>

          </div>

        </div>

      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ORGANIZATION */}

        <section className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 mb-6">

          <div className="mb-5">

            <h2 className="text-xl font-bold">
              Organization Setup
            </h2>

            <p className="text-sm text-zinc-500 mt-1">
              Configure your organization and queue type.
            </p>

          </div>

          <div className="grid md:grid-cols-2 gap-4">

            <div>

              <label className="text-sm text-zinc-400">
                Organization Name
              </label>

              <input
                value={organization.name}
                onChange={(e) =>
                  setOrganization({
                    ...organization,
                    name: e.target.value,
                  })
                }
                className="w-full mt-2 bg-black border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-white"
                placeholder="Enter organization name"
              />

            </div>

            <div>

              <label className="text-sm text-zinc-400">
                Organization Type
              </label>

              <select
                value={organization.type}
                onChange={(e) =>
                  changeOrganizationType(
                    e.target.value
                  )
                }
                className="w-full mt-2 bg-black border border-zinc-700 rounded-xl px-4 py-3 outline-none"
              >

                {organizationTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}

              </select>

            </div>

          </div>

        </section>

        {/* STATISTICS */}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">

            <p className="text-sm text-zinc-500">
              Waiting
            </p>

            <p className="text-3xl font-bold mt-2">
              {waitingCount}
            </p>

          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">

            <p className="text-sm text-zinc-500">
              Serving
            </p>

            <p className="text-3xl font-bold mt-2">
              {servingCount}
            </p>

          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">

            <p className="text-sm text-zinc-500">
              Completed
            </p>

            <p className="text-3xl font-bold mt-2">
              {completedCount}
            </p>

          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">

            <p className="text-sm text-zinc-500">
              Total Amount
            </p>

            <p className="text-3xl font-bold mt-2">
              ₹{totalAmount}
            </p>

          </div>

        </section>

        {/* QR SECTION */}

        <section className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 mb-6">

          <div className="mb-6">

            <h2 className="text-xl font-bold">
              Queue QR Codes
            </h2>

            <p className="text-sm text-zinc-500 mt-1">
              Each service has its own QR code.
            </p>

          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">

            {services.map((service, index) => {

              const qrValue =
                createQRValue(service);

              return (
                <div
                  key={`${service}-${index}`}
                  className="bg-black border border-zinc-800 rounded-2xl p-5"
                >

                  <h3 className="font-semibold text-lg mb-4">
                    {service}
                  </h3>

                  {/* IMPORTANT: WHITE QR AREA */}

                  <div className="flex justify-center items-center bg-white rounded-2xl p-5 min-h-[210px]">

                    <QRCodeCanvas
                      value={qrValue}
                      size={180}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      level="H"
                      includeMargin={true}
                    />

                  </div>

                  <div className="mt-4">

                    <p className="text-xs text-zinc-500 mb-2">
                      Scan this QR to join
                    </p>

                    <div className="bg-zinc-900 rounded-lg px-3 py-2">

                      <p className="text-xs text-zinc-400 break-all">
                        {qrValue}
                      </p>

                    </div>

                  </div>

                </div>
              );

            })}

          </div>

        </section>

        {/* QUEUE CONTROL */}

        <section className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 mb-6">

          <h2 className="text-xl font-bold mb-5">
            Queue Control
          </h2>

          <div className="flex flex-wrap gap-3">

            <button
              onClick={callNext}
              className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-zinc-200"
            >
              Call Next
            </button>

            <button
              onClick={completeCurrent}
              className="bg-zinc-800 px-6 py-3 rounded-xl font-semibold hover:bg-zinc-700"
            >
              Complete
            </button>

            <button
              onClick={skipCurrent}
              className="bg-zinc-800 px-6 py-3 rounded-xl font-semibold hover:bg-zinc-700"
            >
              Skip
            </button>

          </div>

        </section>

        {/* CUSTOMER LIST */}

        <section className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6">

          <div className="mb-5">

            <h2 className="text-xl font-bold">
              Queue Customers
            </h2>

            <p className="text-sm text-zinc-500 mt-1">
              View all customers and their current status.
            </p>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[700px]">

              <thead>

                <tr className="border-b border-zinc-800 text-left text-sm text-zinc-500">

                  <th className="p-4">
                    Token
                  </th>

                  <th className="p-4">
                    Name
                  </th>

                  <th className="p-4">
                    Service
                  </th>

                  <th className="p-4">
                    Amount
                  </th>

                  <th className="p-4">
                    Status
                  </th>

                </tr>

              </thead>

              <tbody>

                {customers.map(
                  (customer, index) => (

                    <tr
                      key={`${customer.token}-${customer.name}-${index}`}
                      className="border-b border-zinc-900"
                    >

                      <td className="p-4 font-bold">
                        #{customer.token}
                      </td>

                      <td className="p-4">
                        {customer.name}
                      </td>

                      <td className="p-4 text-zinc-400">
                        {customer.service}
                      </td>

                      <td className="p-4">
                        ₹{customer.amount}
                      </td>

                      <td className="p-4">

                        <span className="text-sm">
                          {customer.status}
                        </span>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

            {customers.length === 0 && (

              <div className="text-center py-12">

                <p className="text-zinc-500">
                  No customers have joined yet.
                </p>

              </div>

            )}

          </div>

        </section>

      </div>

    </main>
  );
}