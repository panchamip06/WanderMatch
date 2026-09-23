import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Photo, Trip } from '../types';
import { ApiService } from '../services/api';
import { useAuth } from '../services/auth';
import { TripWebSocketClient } from '../services/websocket';
import {
  Image, Camera, Upload, Users, Check,
  AlertCircle, Sparkles, UserCheck
} from 'lucide-react';

export const MyPhotosScreen: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const { userId, token } = useAuth();

  const [effectiveTripId, setEffectiveTripId] = useState<string | null>(tripId || null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [activeTab, setActiveTab] = useState<'my' | 'gallery'>('my');

  const [myPhotos, setMyPhotos] = useState<Photo[]>([]);
  const [galleryPhotos, setGalleryPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-resolve tripId if needed
  useEffect(() => {
    if (!effectiveTripId) {
      ApiService.getMyTrips(token || undefined)
        .then((trips) => {
          if (trips && trips.length > 0) {
            setEffectiveTripId(trips[0].trip_id);
          } else {
            setLoading(false);
          }
        })
        .catch(() => setLoading(false));
    }
  }, [effectiveTripId, token]);

  const loadPhotos = useCallback(async () => {
    try {
      const [fetchedMy, fetchedTrip, fetchedGallery] = await Promise.all([
        ApiService.getMyPhotos(effectiveTripId || undefined, token || undefined),
        effectiveTripId ? ApiService.getTripDetail(effectiveTripId, token || undefined) : Promise.resolve(null),
        effectiveTripId ? ApiService.getTripPhotos(effectiveTripId, token || undefined) : Promise.resolve([]),
      ]);
      setMyPhotos(fetchedMy);
      if (fetchedTrip) setTrip(fetchedTrip);
      setGalleryPhotos(fetchedGallery);
    } catch (e: any) {
      console.error('Failed to load photos:', e);
      setErrorMsg(e.message || 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  }, [effectiveTripId, token]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // Real-time WebSocket connection
  useEffect(() => {
    if (!effectiveTripId) return;

    const wsClient = new TripWebSocketClient(effectiveTripId, userId || 'anon');
    wsClient.connect();

    const unsubscribe = wsClient.subscribe((msg: any) => {
      if (msg.type === 'photo_uploaded') {
        loadPhotos();
      }
    });

    return () => {
      unsubscribe();
      wsClient.disconnect();
    };
  }, [effectiveTripId, userId, loadPhotos]);

  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveTripId) return;

    setUploading(true);
    setErrorMsg(null);

    // Create a mock canvas image data URL for demo upload
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 600;
    sampleCanvas.height = 400;
    const ctx = sampleCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 600, 400);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '20px sans-serif';
      ctx.fillText(caption || 'WanderMatch Trip Memory', 50, 200);
    }
    const sampleDataUrl = sampleCanvas.toDataURL('image/jpeg');

    try {
      await ApiService.uploadTripPhoto(
        effectiveTripId,
        { image_data: sampleDataUrl, caption: caption.trim() },
        token || undefined
      );
      setSuccessMsg('Photo uploaded and processed for face recognition!');
      setShowUploadModal(false);
      setCaption('');
      await loadPhotos();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmTag = async (photoId: string, tagId: string, currentStatus: boolean) => {
    try {
      await ApiService.confirmPhotoTag(photoId, tagId, !currentStatus, token || undefined);
      await loadPhotos();
    } catch (e) {
      console.error(e);
    }
  };

  const currentDisplayPhotos = activeTab === 'my' ? myPhotos : galleryPhotos;

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
            <Image className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Trip Photos & Personal Albums
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Cloudinary photo gallery with automatic DeepFace / ArcFace member recognition and tagging.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <Link
            to="/face-reg"
            className="inline-flex items-center text-xs font-bold px-3.5 py-2 rounded-xl bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200 transition-colors"
          >
            <Camera className="w-4 h-4 mr-1.5 text-pink-600" />
            Face Profile
          </Link>

          {effectiveTripId && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center text-xs font-bold px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
            >
              <Upload className="w-4 h-4 mr-1.5" />
              Upload Photo
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center transition-colors ${
              activeTab === 'my'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <UserCheck className="w-4 h-4 mr-1.5" />
            My Tagged Photos ({myPhotos.length})
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center transition-colors ${
              activeTab === 'gallery'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Users className="w-4 h-4 mr-1.5" />
            Trip Shared Gallery ({galleryPhotos.length})
          </button>
        </div>

        {effectiveTripId && (
          <span className="text-xs font-mono text-gray-400">
            Trip: {trip?.title || effectiveTripId}
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
            <Check className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
            {successMsg}
          </span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 font-bold ml-2">×</button>
        </div>
      )}

      {/* Photo Grid */}
      {loading ? (
        <div className="flex flex-col justify-center items-center h-64 text-gray-400 space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold">Loading photo gallery...</p>
        </div>
      ) : currentDisplayPhotos.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-gray-200 text-center space-y-4">
          <Image className="w-10 h-10 text-gray-300 mx-auto" />
          <div>
            <h3 className="font-bold text-gray-800 text-base">
              {activeTab === 'my' ? 'No Photos Tagged With You Yet' : 'No Trip Photos Uploaded Yet'}
            </h3>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              {activeTab === 'my'
                ? 'When photos are uploaded to your trips, our face recognition engine will automatically tag and group them here.'
                : 'Upload your group trip photos to share with all members and generate automatic face-tagged albums.'}
            </p>
          </div>
          {effectiveTripId && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              Upload First Photo
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {currentDisplayPhotos.map((photo) => (
            <div
              key={photo.photo_id}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="relative aspect-4/3 bg-gray-100 overflow-hidden">
                <img
                  src={photo.thumbnail_url || photo.cloudinary_url}
                  alt={photo.caption || 'Trip Photo'}
                  className="w-full h-full object-cover"
                  onError={(e: any) => {
                    e.target.src = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80';
                  }}
                />
                {photo.person_tags && photo.person_tags.length > 0 && (
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center">
                    <Sparkles className="w-3 h-3 mr-1 text-amber-400" />
                    {photo.person_tags.length} Face{photo.person_tags.length > 1 ? 's' : ''} Tagged
                  </div>
                )}
              </div>

              <div className="p-4 space-y-2.5">
                {photo.caption && (
                  <p className="text-xs font-medium text-gray-800 line-clamp-2">"{photo.caption}"</p>
                )}

                <div className="text-[10px] text-gray-400 flex items-center justify-between">
                  <span>Uploaded by {photo.uploader_user_id}</span>
                  <span>{new Date(photo.uploaded_at).toLocaleDateString()}</span>
                </div>

                {/* Face Tags Roster */}
                {photo.person_tags && photo.person_tags.length > 0 && (
                  <div className="pt-2 border-t border-gray-100 space-y-1.5">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Detected Members:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {photo.person_tags.map((tag) => (
                        <button
                          key={tag.tag_id}
                          onClick={() => handleConfirmTag(photo.photo_id, tag.tag_id, tag.is_confirmed)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center space-x-1 border transition-colors ${
                            tag.is_confirmed
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                          title="Click to toggle confirmation"
                        >
                          <span>{tag.user_id}</span>
                          {tag.confidence && (
                            <span className="opacity-70">({Math.round(tag.confidence * 100)}%)</span>
                          )}
                          {tag.is_confirmed ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <span className="text-[9px] text-amber-600">?</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Photo Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Upload Trip Photo</h3>
                  <p className="text-xs text-gray-500">Stored on Cloudinary & scanned for member faces.</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadPhoto} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Photo Caption</label>
                <input
                  type="text"
                  placeholder="e.g., Sunset over Amber Fort courtyard"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 text-xs text-indigo-900 space-y-1">
                <span className="font-bold flex items-center">
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Auto-Tagging Enabled
                </span>
                <p className="text-[11px] text-gray-600">
                  Detected faces will be matched against trip members' registered face profiles.
                  Low-confidence matches remain Unknown.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors"
                >
                  {uploading ? 'Processing...' : 'Upload & Tag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
