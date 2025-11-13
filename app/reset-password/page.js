import React, { Suspense } from "react";
import ResetForm from "./ResetForm.client";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <ResetForm />
    </Suspense>
  );
}