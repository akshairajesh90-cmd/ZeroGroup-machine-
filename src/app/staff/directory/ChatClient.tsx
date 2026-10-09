"use client";

import React, { useState, useEffect, useRef } from "react";
import { Users, Phone, HardHat, Shield, Search, Send, Image as ImageIcon, Loader2 } from "lucide-react";
import { getChatMessages, sendChatMessage } from "@/actions/chat";

export default function ChatClient({ employees, currentUserEmployeeId }: { employees: any[], currentUserEmployeeId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Polling for new messages
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const data = await getChatMessages();
      setMessages(data);
    } catch (err) {
      console.error(err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsSending(true);
    const formData = new FormData();
    formData.append("text", newMessage);

    try {
      await sendChatMessage(formData);
      setNewMessage("");
      await fetchMessages();
    } catch (err) {
      alert("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "OPERATOR":
      case "WORKER": return <HardHat className="h-4 w-4 text-amber-500" />;
      case "DRIVER": return <Users className="h-4 w-4 text-blue-500" />;
      case "STAFF":
      case "ADMIN":
      case "OWNER": return <Shield className="h-4 w-4 text-emerald-500" />;
      default: return <Users className="h-4 w-4 text-zinc-500" />;
    }
  };

  return (
    <div className="flex h-full bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
      
      {/* Left Sidebar: Directory */}
      <div className="w-1/3 min-w-[300px] border-r border-zinc-800 flex flex-col bg-zinc-900/30">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/80">
          <h2 className="text-lg font-black text-white flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-emerald-500" /> Crew Directory
          </h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search directory..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:border-emerald-500 outline-none"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {filteredEmployees.map(emp => {
            const sanitizedPhone = emp.phone?.replace(/\D/g, "") || "";
            const waPhone = sanitizedPhone.length === 10 ? `91${sanitizedPhone}` : sanitizedPhone;
            const hasWhatsApp = waPhone.length >= 10;

            return (
              <div key={emp.id} className="flex items-center justify-between p-3 hover:bg-zinc-800/50 rounded-xl transition-colors mb-1 group">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700">
                    {emp.profilePhotoUrl ? (
                      <img src={emp.profilePhotoUrl} className="w-full h-full rounded-full object-cover" alt="" />
                    ) : (
                      getRoleIcon(emp.role)
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{emp.name}</h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{emp.role}</p>
                  </div>
                </div>
                {hasWhatsApp && (
                  <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black rounded-full transition-all">
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Area: Global Chat */}
      <div className="flex-1 flex flex-col bg-[url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-cover bg-center relative">
        <div className="absolute inset-0 bg-black/80 z-0"></div>
        
        {/* Chat Header */}
        <div className="relative z-10 p-4 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white">Global Operations Channel</h2>
            <p className="text-xs text-emerald-500 font-bold tracking-widest uppercase mt-0.5">• All Staff & Crew Online</p>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          {messages.map((msg, i) => {
            const isMe = msg.senderId === currentUserEmployeeId;
            const isConsecutive = i > 0 && messages[i - 1].senderId === msg.senderId;
            
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${isConsecutive ? "mt-1" : "mt-4"}`}>
                {!isConsecutive && !isMe && (
                  <div className="flex items-center gap-1.5 mb-1 ml-1">
                    <span className="text-[10px] font-bold text-zinc-400">{msg.senderName}</span>
                    <span className="text-[9px] font-black uppercase bg-zinc-800 text-zinc-300 px-1.5 rounded">{msg.senderRole}</span>
                  </div>
                )}
                
                <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-lg ${
                  isMe ? "bg-emerald-600 text-white rounded-tr-sm" : "bg-zinc-800 text-white rounded-tl-sm border border-zinc-700"
                }`}>
                  {msg.mediaUrl && (
                    <img src={msg.mediaUrl} alt="Attachment" className="rounded-xl mb-2 max-h-60 object-cover w-full" />
                  )}
                  {msg.text && <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>}
                  <span className={`text-[9px] block text-right mt-1 ${isMe ? "text-emerald-200" : "text-zinc-500"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="relative z-10 p-4 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800">
          <form onSubmit={handleSend} className="flex items-center gap-3">
            <button type="button" className="p-3 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-full transition-colors">
              <ImageIcon className="w-5 h-5" />
            </button>
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message to the company channel..."
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-5 py-3.5 text-sm text-white focus:border-emerald-500 outline-none"
            />
            <button 
              type="submit"
              disabled={isSending || !newMessage.trim()}
              className="p-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full transition-all disabled:opacity-50"
            >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
