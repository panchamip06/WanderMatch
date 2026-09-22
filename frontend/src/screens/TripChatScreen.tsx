import React, { useState } from 'react';
import { useAuth } from '../services/auth';
import { MessageSquare, Send, Zap } from 'lucide-react';

interface Message {
  sender: string;
  text: string;
  time: string;
  isOverride?: boolean;
}

export const TripChatScreen: React.FC = () => {
  const { userId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'usr_0f22b1', text: 'Hey team, let us finalize Day 2 morning activity.', time: '14:20' },
    { sender: 'usr_1a2b3c', text: 'I voted No on the 6am slot because the museum does not open until 9am.', time: '14:22' },
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { sender: userId, text: input, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]);
    setInput('');
  };

  const handleUnanimousOverride = () => {
    setMessages((prev) => [
      ...prev,
      {
        sender: 'SYSTEM',
        text: '⚡ Unanimous Trip Chat agreement triggered! AI consensus process terminated immediately.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOverride: true,
      },
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Trip Chat (Mandatory Always-On)</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Live discussion channel. Unanimous agreement here can immediately override the AI consensus round.
            </p>
          </div>
        </div>

        <button
          onClick={handleUnanimousOverride}
          className="flex items-center px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs"
        >
          <Zap className="w-3.5 h-3.5 mr-1" />
          Trigger Unanimous Override
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 h-96 flex flex-col justify-between overflow-hidden shadow-xs">
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl max-w-md text-xs space-y-1 ${
                m.isOverride
                  ? 'bg-amber-50 border border-amber-200 text-amber-900 font-medium mx-auto text-center'
                  : m.sender === userId
                  ? 'bg-blue-600 text-white ml-auto'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {!m.isOverride && (
                <div className="flex justify-between text-[10px] opacity-75">
                  <span>{m.sender}</span>
                  <span>{m.time}</span>
                </div>
              )}
              <p>{m.text}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="p-3 bg-gray-50 border-t border-gray-200 flex space-x-2">
          <input
            type="text"
            placeholder="Type your message to the group..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 text-xs bg-white border border-gray-300 rounded-lg px-3 py-2"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center"
          >
            <Send className="w-3.5 h-3.5 mr-1" /> Send
          </button>
        </form>
      </div>
    </div>
  );
};
