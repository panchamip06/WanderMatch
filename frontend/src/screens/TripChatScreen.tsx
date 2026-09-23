import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ChatMessage, Trip } from '../types';
import { ApiService } from '../services/api';
import { useAuth } from '../services/auth';
import { TripWebSocketClient } from '../services/websocket';
import { MessageSquare, Send, Zap, ArrowLeft, AlertCircle, Users } from 'lucide-react';

export const TripChatScreen: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { userId, token } = useAuth();

  const [effectiveTripId, setEffectiveTripId] = useState<string | null>(tripId || null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Resolve tripId if accessed via /chat directly
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
        .catch((e) => {
          console.error(e);
          setLoading(false);
        });
    }
  }, [effectiveTripId, token]);

  const loadChat = useCallback(async () => {
    if (!effectiveTripId) return;
    try {
      const [fetchedTrip, fetchedMessages] = await Promise.all([
        ApiService.getTripDetail(effectiveTripId, token || undefined),
        ApiService.getChatMessages(effectiveTripId, token || undefined),
      ]);
      setTrip(fetchedTrip);
      setMessages(fetchedMessages);
    } catch (e: any) {
      console.error('Failed to load chat:', e);
      setErrorMsg(e.message || 'Failed to load chat history');
    } finally {
      setLoading(false);
    }
  }, [effectiveTripId, token]);

  useEffect(() => {
    loadChat();
  }, [loadChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time WebSocket listener for live chat
  useEffect(() => {
    if (!effectiveTripId) return;

    const wsClient = new TripWebSocketClient(effectiveTripId, userId || 'anon');
    wsClient.connect();

    const unsubscribe = wsClient.subscribe((msg: any) => {
      if (msg.type === 'chat_message') {
        const newMsg: ChatMessage = {
          message_id: msg.message_id,
          trip_id: msg.trip_id,
          user_id: msg.user_id,
          body: msg.body,
          is_unanimous_override: Boolean(msg.is_unanimous_override),
          sent_at: msg.sent_at,
        };
        setMessages((prev) => {
          // Avoid duplicate appends if client added optimistically
          if (prev.some((m) => m.message_id === newMsg.message_id)) return prev;
          return [...prev, newMsg];
        });
      }
    });

    return () => {
      unsubscribe();
      wsClient.disconnect();
    };
  }, [effectiveTripId, userId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveTripId || !input.trim() || sending) return;

    const bodyText = input.trim();
    setInput('');
    setSending(true);
    setErrorMsg(null);

    try {
      const sent = await ApiService.sendChatMessage(
        effectiveTripId,
        { body: bodyText, is_unanimous_override: false },
        token || undefined
      );
      setMessages((prev) => {
        if (prev.some((m) => m.message_id === sent.message_id)) return prev;
        return [...prev, sent];
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send message');
      setInput(bodyText);
    } finally {
      setSending(false);
    }
  };

  const handleUnanimousOverride = async () => {
    if (!effectiveTripId || sending) return;
    const confirmOverride = window.confirm(
      'Trigger Unanimous Trip Chat Agreement Override?\n\n' +
      'Per design §5A, unanimous agreement in Trip Chat immediately overrides and terminates ' +
      'any active AI consensus negotiation.'
    );
    if (!confirmOverride) return;

    setSending(true);
    setErrorMsg(null);
    try {
      const overrideText = '⚡ UNANIMOUS OVERRIDE: The entire group agreed in Trip Chat. Terminating active AI consensus process.';
      const sent = await ApiService.sendChatMessage(
        effectiveTripId,
        { body: overrideText, is_unanimous_override: true },
        token || undefined
      );
      setMessages((prev) => {
        if (prev.some((m) => m.message_id === sent.message_id)) return prev;
        return [...prev, sent];
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to trigger unanimous override');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-gray-400 space-y-3">
        <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold">Connecting to Trip Chat...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Back Button */}
      <button
        onClick={() => effectiveTripId ? navigate(`/trips/${effectiveTripId}`) : navigate('/app')}
        className="inline-flex items-center text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Back to Trip Itinerary
      </button>

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Trip Chat — {trip?.title || 'Group Channel'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
              <span>Mandatory always-on channel. Live WebSocket synchronized.</span>
              <span>·</span>
              <span className="flex items-center text-gray-700 font-semibold">
                <Users className="w-3.5 h-3.5 mr-1 text-gray-400" />
                {trip?.members?.length || 1} members
              </span>
            </p>
          </div>
        </div>

        <button
          onClick={handleUnanimousOverride}
          disabled={sending}
          className="flex items-center px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
          title="Signals unanimous agreement to immediately terminate active AI consensus rounds."
        >
          <Zap className="w-3.5 h-3.5 mr-1.5" />
          Trigger Unanimous Override
        </button>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center justify-between">
          <span className="flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 text-rose-600 shrink-0" />
            {errorMsg}
          </span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 font-bold ml-2">×</button>
        </div>
      )}

      {/* Chat Window Container */}
      <div className="bg-white rounded-3xl border border-gray-200 h-[500px] flex flex-col justify-between overflow-hidden shadow-xs">
        {/* Messages List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 flex-1 bg-gray-50/40">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-2">
              <MessageSquare className="w-8 h-8 text-gray-300" />
              <p className="text-xs">No messages yet. Say hello or discuss slot changes!</p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.user_id === userId;
              const timeFormatted = new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              if (m.is_unanimous_override) {
                return (
                  <div
                    key={m.message_id}
                    className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 text-amber-950 font-medium text-xs max-w-lg mx-auto shadow-2xs text-center space-y-1 my-2"
                  >
                    <div className="flex items-center justify-center space-x-1.5 font-bold uppercase tracking-wider text-[11px] text-amber-800">
                      <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                      <span>Unanimous Chat Override</span>
                      <span>·</span>
                      <span className="font-normal font-mono text-[10px] text-amber-700">{timeFormatted}</span>
                    </div>
                    <p className="text-xs">{m.body}</p>
                    <span className="text-[10px] text-amber-700 block italic">Triggered by {m.user_id}</span>
                  </div>
                );
              }

              return (
                <div
                  key={m.message_id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 mb-1 px-1">
                    <span className="font-semibold text-gray-600">{m.user_id}</span>
                    <span>·</span>
                    <span>{timeFormatted}</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl max-w-md text-xs space-y-1 shadow-2xs leading-relaxed ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-xs'
                    }`}
                  >
                    <p>{m.body}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 sm:p-4 bg-white border-t border-gray-100 flex items-center space-x-2">
          <input
            type="text"
            placeholder="Type your message to the group..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
            className="flex-1 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center shadow-xs transition-colors"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
