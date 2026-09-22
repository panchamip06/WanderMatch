import React, { useState } from 'react';
import { Camera, CheckCircle, Shield } from 'lucide-react';

export const FaceRegistrationScreen: React.FC = () => {
  const [captured, setCaptured] = useState<number[]>([1, 2]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-pink-50 text-pink-600">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">3-Photo Face Registration</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Optional opt-in face registration. Automatically sorts shared trip photos into private personal albums via DeepFace.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div className="flex items-center space-x-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-200">
          <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Privacy Guaranteed: Face images are converted into mathematical embeddings and raw images are never exposed. Low-confidence matches remain Unknown and are never force-tagged.</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((slot) => {
            const isDone = captured.includes(slot);
            return (
              <div
                key={slot}
                className={`border-2 border-dashed rounded-2xl h-48 flex flex-col items-center justify-center p-4 transition-colors ${
                  isDone ? 'border-emerald-400 bg-emerald-50/20' : 'border-gray-300 bg-gray-50'
                }`}
              >
                {isDone ? (
                  <div className="text-center space-y-2">
                    <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                    <span className="text-xs font-bold text-emerald-900 block">Angle {slot} Captured</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Embedding Generated</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setCaptured((prev) => [...prev, slot])}
                    className="text-center space-y-2 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 block">Capture Angle {slot}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
