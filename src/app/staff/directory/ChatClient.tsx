"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Users,
  Phone,
  HardHat,
  Shield,
  Search,
  Send,
  Image as ImageIcon,
  Loader2,
  X,
  ExternalLink,
  Building2,
  DollarSign,
  MapPin,
  Clock,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { getChatMessages, sendChatMessage } from "@/actions/chat";

export default function ChatClient({ employees, currentUserEmployeeId }: { employees: any[], currentUserEmployeeId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
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
    emp.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.phone && emp.phone.includes(searchTerm)) ||
    (emp.defaultCrewRole && emp.defaultCrewRole.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "OPERATOR":
      case "WORKER": return <HardHat className="h-4 w-4 text-amber-500" />;
      case "DRIVER": return <Users className="h-4 w-4 text-cyan-500" />;
      case "STAFF":
      case "ADMIN":
      case "OWNER": return <Shield className="h-4 w-4 text-emerald-500" />;
      default: return <Users className="h-4 w-4 text-zinc-500" />;
    }
  };

  return (
    <div className="flex h-full bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative">
      
      {/* Left Sidebar: Directory */}
      <div className="w-1/3 min-w-[320px] max-w-sm border-r border-zinc-800 flex flex-col bg-zinc-900/30">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500" /> Crew Directory
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-bold">
              {filteredEmployees.length}
            </span>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search by name, role, phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:border-emerald-500 outline-none"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {filteredEmployees.map(emp => {
            const sanitizedPhone = emp.phone?.replace(/\D/g, "") || "";
            const waPhone = sanitizedPhone.length === 10 ? `91${sanitizedPhone}` : sanitizedPhone;
            const hasWhatsApp = waPhone.length >= 10;
            const isSelected = selectedEmployee?.id === emp.id;

            return (
              <div 
                key={emp.id} 
                onClick={() => setSelectedEmployee(emp)}
                className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer group ${
                  isSelected 
                    ? "bg-zinc-800/90 border border-emerald-500/30 shadow-md ring-1 ring-emerald-500/20" 
                    : "hover:bg-zinc-800/50 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden">
                    {emp.profilePhotoUrl ? (
                      <img src={emp.profilePhotoUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      getRoleIcon(emp.role)
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                      {emp.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                        {emp.role}
                      </span>
                      {emp.operatorType === "INTERNAL" ? (
                        <span className="text-[9px] px-1 rounded bg-emerald-500/10 text-emerald-400 font-medium">Company</span>
                      ) : (
                        <span className="text-[9px] px-1 rounded bg-purple-500/10 text-purple-400 font-medium">Outside</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {hasWhatsApp && (
                    <a 
                      href={`https://wa.me/${waPhone}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black rounded-lg transition-all"
                      title="WhatsApp Chat"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
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

      {/* FLYOUT PROFILE CARD MODAL */}
      {selectedEmployee && (
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-zinc-900/95 backdrop-blur-xl border-l border-zinc-800 shadow-2xl z-20 flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Crew Profile Preview
            </span>
            <button 
              onClick={() => setSelectedEmployee(null)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Profile Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
            {/* Avatar & Main Info */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl font-black text-white shrink-0 overflow-hidden">
                {selectedEmployee.profilePhotoUrl ? (
                  <img src={selectedEmployee.profilePhotoUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  selectedEmployee.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-black text-white truncate">{selectedEmployee.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 uppercase">
                    {selectedEmployee.role}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    selectedEmployee.operatorType === "INTERNAL" 
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" 
                      : "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                  }`}>
                    {selectedEmployee.operatorType === "INTERNAL" ? "Company Worker" : "Outside Worker"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Contact Action Bar */}
            <div className="grid grid-cols-2 gap-2">
              {selectedEmployee.phone ? (
                <>
                  <a
                    href={`tel:${selectedEmployee.phone}`}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call (+91)
                  </a>
                  <a
                    href={`https://wa.me/${selectedEmployee.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-green-600/20 text-green-400 border border-green-500/30 rounded-xl text-xs font-bold hover:bg-green-600 hover:text-white transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                </>
              ) : (
                <div className="col-span-2 text-center text-xs text-zinc-500 italic py-2">
                  No direct phone number listed
                </div>
              )}
            </div>

            {/* Wages & Rates Preview */}
            <div className="bg-zinc-950/60 rounded-2xl p-4 border border-zinc-800/80 space-y-3">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
                Wage Structure
              </span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Base Wage:</span>
                <span className="font-bold text-white">
                  ₹{selectedEmployee.baseDailyWage ? selectedEmployee.baseDailyWage.toLocaleString("en-IN") : (selectedEmployee.operatorType === "INTERNAL" ? "1,100" : "1,200")} /day
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Daily Food Bata:</span>
                <span className="font-bold text-amber-400">
                  ₹{selectedEmployee.dailyBataRate || 0} /day
                </span>
              </div>
            </div>

            {/* Capable Roles */}
            {selectedEmployee.capableRoles && selectedEmployee.capableRoles.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Qualified Job Roles ({selectedEmployee.capableRoles.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedEmployee.capableRoles.map((rId: string) => (
                    <span 
                      key={rId}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-700/60"
                    >
                      {rId.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Mention in Chat Shortcut */}
            <button
              onClick={() => {
                setNewMessage((prev) => `@${selectedEmployee.name} ${prev}`);
              }}
              className="w-full py-2 bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold transition-colors border border-zinc-700/50"
            >
              @ Mention {selectedEmployee.name} in Chat
            </button>
          </div>

          {/* Action Footer */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-950/80">
            <Link
              href={`/staff/operators/${selectedEmployee.id}`}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              View Full Operator Profile & Work History
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}
