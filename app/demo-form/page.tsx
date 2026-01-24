"use client";

import { useState } from "react";
import DiveForm from "@/components/forms/DiveForm";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Card } from "primereact/card";
import { Messages } from "primereact/messages";
import { Message } from "primereact/message";
import { Badge } from "primereact/badge";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function DemoFormContent() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSuccess = (diveId: string) => {
    setSuccessMessage(`Dive logged successfully! ID: ${diveId}`);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
            <i className="pi pi-book text-blue-600"></i>
            Log a Dive
          </h1>
          <p className="text-lg text-gray-600">
            Complete dive form with integrated location picker
            <Badge value="PrimeReact" className="ml-3" severity="info" />
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="max-w-4xl mx-auto mb-6">
            <Message severity="success" text={successMessage} className="w-full" />
          </div>
        )}

        {/* Form */}
        <div className="max-w-4xl mx-auto">
          <Card title="Dive Logging Form" className="shadow-lg">
            <DiveForm
              userId="demo-user-123"
              onSuccess={handleSuccess}
            />
          </Card>
        </div>

        {/* Instructions */}
        <div className="max-w-4xl mx-auto mt-6">
          <Card
            title={
              <div className="flex items-center gap-2">
                <i className="pi pi-info-circle text-blue-600"></i>
                How This Works
              </div>
            }
            className="bg-blue-50"
          >
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <Badge value="1" className="mt-0.5" />
                <span>Select your dive location using the map (click, search, or drag marker)</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge value="2" className="mt-0.5" />
                <span>Fill in the dive details (date, depth, duration, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge value="3" className="mt-0.5" />
                <span>Click "Log Dive" to save to Convex database</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge value="4" className="mt-0.5" />
                <span>
                  Location data (name, latitude, longitude) is automatically saved with the dive
                </span>
              </li>
            </ul>
          </Card>
        </div>

        {/* Integration Info */}
        <div className="max-w-4xl mx-auto mt-6">
          <Card
            title={
              <div className="flex items-center gap-2">
                <i className="pi pi-database text-purple-600"></i>
                Database Integration
              </div>
            }
          >
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <strong className="text-gray-900">Mutation:</strong>
                <Badge value="api.dives.createDive" severity="secondary" className="ml-2" />
              </div>
              <div>
                <strong className="text-gray-900">Location Fields Saved:</strong>
                <ul className="ml-6 list-disc space-y-2 mt-2">
                  <li>
                    <code className="bg-gray-100 px-2 py-1 rounded text-purple-700">location</code>
                    <span className="text-gray-600 ml-2">- Location name/address</span>
                  </li>
                  <li>
                    <code className="bg-gray-100 px-2 py-1 rounded text-purple-700">latitude</code>
                    <span className="text-gray-600 ml-2">- GPS latitude coordinate</span>
                  </li>
                  <li>
                    <code className="bg-gray-100 px-2 py-1 rounded text-purple-700">longitude</code>
                    <span className="text-gray-600 ml-2">- GPS longitude coordinate</span>
                  </li>
                </ul>
              </div>
              <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
                <div className="flex items-center gap-2 text-green-800">
                  <i className="pi pi-check-circle"></i>
                  <span className="font-semibold">Tech Stack:</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge value="Leaflet" severity="success" />
                  <Badge value="OpenStreetMap" severity="success" />
                  <Badge value="Geoapify" severity="success" />
                  <Badge value="PrimeReact" severity="info" />
                  <Badge value="Convex" severity="warning" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}

export default function DemoFormPage() {
  return (
    <ConvexProvider client={convex}>
      <DemoFormContent />
    </ConvexProvider>
  );
}
