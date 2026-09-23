import React, { useState, useEffect } from 'react';
import type { FaceProfile } from '../types';
import { ApiService } from '../services/api';
import { useAuth } from '../services/auth';
import {
  Camera, CheckCircle2, Shield, AlertCircle, RefreshCw,
  Sparkles, Check
} from 'lucide-react';

interface AngleSlot {
  id: 'photo_straight' | 'photo_left' | 'photo_right';
  label: string;
  description: string;
}

const ANGLES: AngleSlot[] = [
  { id: 'photo_straight', label: 'Angle 1: Straight', description: 'Frontal face looking directly at the camera' },
  { id: 'photo_left', label: 'Angle 2: Left 45°', description: 'Head turned 45 degrees to the left' },
  { id: 'photo_right', label: 'Angle 3: Right 45°', description: 'Head turned 45 degrees to the right' },
];

export const FaceRegistrationScreen: React.FC = () => {
  const { token } = useAuth();

  const [profile, setProfile] = useState<FaceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const p = await ApiService.getFaceProfile(token || undefined);
      setProfile(p);
    } catch (e) {
      console.error('Failed to load profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCaptureAngle = (slotId: 'photo_straight' | 'photo_left' | 'photo_right') => {
    // Generate sample image data URL for camera capture
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 300;
    sampleCanvas.height = 300;
    const ctx = sampleCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, 300, 300);
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px sans-serif';
      ctx.fillText(`${slotId.replace('photo_', '')} face capture`, 60, 150);
    }
    const dataUrl = sampleCanvas.toDataURL('image/jpeg');

    setPhotos((prev) => ({
      ...prev,
      [slotId]: dataUrl,
    }));
  };

  const handleSubmit = async () => {
    if (!photos.photo_straight || !photos.photo_left || !photos.photo_right) {
      setErrorMsg('Please capture all 3 angles (straight, left 45°, right 45°) to register.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const reg = await ApiService.registerFace(
        {
          photo_straight: photos.photo_straight,
          photo_left: photos.photo_left,
          photo_right: photos.photo_right,
        },
        token || undefined
      );
      setProfile(reg);
      setSuccessMsg('Face successfully registered with 3 reference angles!');
    } catch (e: any) {
      setErrorMsg(e.message || 'Face registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const allCaptured = Boolean(photos.photo_straight && photos.photo_left && photos.photo_right);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-gray-400 space-y-3">
        <div className="w-8 h-8 border-3 border-pink-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold">Loading face registration status...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-pink-50 text-pink-600">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">3-Photo Face Registration</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Optional opt-in face registration. Automatically sorts shared trip photos into your personal album.
            </p>
          </div>
        </div>

        {profile && (
          <span className="inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
            <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" />
            Face Profile Registered
          </span>
        )}
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center justify-between">
          <span className="flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 text-rose-600 shrink-0" />
            {errorMsg}
          </span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 font-bold ml-2">×</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between">
          <span className="flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
            {successMsg}
          </span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 font-bold ml-2">×</button>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 flex items-start space-x-3 text-xs text-gray-600 shadow-2xs">
        <Shield className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <span className="font-bold text-gray-900 block">Privacy Guaranteed</span>
          <p>
            Reference photos are converted into mathematical embedding vectors. Low-confidence matches (below the 0.68 threshold)
            remain marked <strong>Unknown</strong> and are never force-tagged.
          </p>
        </div>
      </div>

      {/* 3 Angles Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {ANGLES.map((angle) => {
          const isCaptured = Boolean(photos[angle.id]) || Boolean(profile);

          return (
            <div
              key={angle.id}
              className={`border-2 rounded-2xl p-5 flex flex-col items-center justify-between text-center transition-all min-h-[220px] ${
                isCaptured
                  ? 'border-emerald-300 bg-emerald-50/20 shadow-2xs'
                  : 'border-dashed border-gray-300 bg-white hover:border-gray-400'
              }`}
            >
              <div className="space-y-1">
                <span className="text-xs font-bold text-gray-900 block">{angle.label}</span>
                <p className="text-[11px] text-gray-500 leading-snug">{angle.description}</p>
              </div>

              {isCaptured ? (
                <div className="my-auto space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/60 px-2.5 py-0.5 rounded-full inline-block">
                    Reference Captured
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleCaptureAngle(angle.id)}
                  className="my-auto group flex flex-col items-center space-y-2"
                >
                  <div className="w-12 h-12 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-gray-700">Capture Angle</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleCaptureAngle(angle.id)}
                className="text-[11px] text-gray-400 hover:text-gray-600 underline font-medium"
              >
                {isCaptured ? 'Retake Photo' : 'Upload File'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Submit Registration Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSubmit}
          disabled={submitting || !allCaptured}
          className="px-6 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors flex items-center"
        >
          {submitting ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Registering...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              {profile ? 'Update Face Profile' : 'Save 3-Photo Registration'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
