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
  Sparkles,
  MessageSquare,
  Truck,
  UserCheck,
  ChevronRight,
  PhoneCall
} from "lucide-react";
import { getChatMessages, sendChatMessage } from "@/actions/chat";

export default function ChatClient({
  employees,
  currentUserEmployeeId,
}: {
  employees: any[];
  currentUserEmployeeId: string;
}) {
  const [mobileTab, setMobileTab] = useState<"directory" | "chat">("directory");
  const [messages, setMessages] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, mobileTab]);

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
    formData.append("text", newMessage.trim());

    try {
      await sendChatMessage(formData);
      setNewMessage("");
      await fetchMessages();
      scrollToBottom();
    } catch (err) {
      alert("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.phone && emp.phone.includes(searchTerm))
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "OPERATOR":
      case "WORKER":
        return <HardHat className="h-4 w-4 text-amber-400" />;
      case "DRIVER":
        return <Truck className="h-4 w-4 text-cyan-400" />;
      case "STAFF":
        return <UserCheck className="h-4 w-4 text-emerald-400" />;
      case "ADMIN":
      case "OWNER":
        return <Shield className="h-4 w-4 text-purple-400" />;
      default:
        return <Users className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl relative font-sans">
      {/* Mobile Tab Switcher (< md screens) */}
      <div className="md:hidden p-2.5 bg-slate-900 border-b border-slate-800 shrink-0 z-10">
        <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setMobileTab("directory")}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              mobileTab === "directory"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-900/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Crew Directory ({filteredEmployees.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab("chat")}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              mobileTab === "chat"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Operations Chat</span>
          </button>
        </div>
      </div>

      {/* Left Sidebar: Directory (Always visible on desktop, tabbed on mobile) */}
      <div
        className={`${
          mobileTab === "directory" ? "flex" : "hidden"
        } md:flex w-full md:w-80 lg:w-96 border-r border-slate-800/80 flex-col bg-slate-900/40 shrink-0`}
      >
        <div className="p-3.5 border-b border-slate-800/80 bg-slate-900/90">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" /> Crew Directory
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
              {filteredEmployees.length} members
            </span>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, role, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-8 pr-4 py-2 text-xs text-white placeholder:text-slate-500 outline-none transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-700/60">
          {filteredEmployees.map((emp) => {
            const sanitizedPhone = emp.phone?.replace(/\D/g, "") || "";
            const waPhone = sanitizedPhone.length === 10 ? `91${sanitizedPhone}` : sanitizedPhone;
            const hasWhatsApp = waPhone.length >= 10;
            const isSelected = selectedEmployee?.id === emp.id;

            return (
              <div
                key={emp.id}
                onClick={() => setSelectedEmployee(emp)}
                className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group ${
                  isSelected
                    ? "bg-slate-800/95 border border-cyan-500/40 shadow-md ring-1 ring-cyan-500/20"
                    : "hover:bg-slate-850/60 bg-slate-900/40 border border-slate-800/50"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                    {emp.profilePhotoUrl ? (
                      <img
                        src={emp.profilePhotoUrl}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    ) : (
                      getRoleIcon(emp.role)
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                      {emp.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                        {emp.role}
                      </span>
                      {emp.operatorType === "INTERNAL" ? (
                        <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">
                          Company
                        </span>
                      ) : (
                        <span className="text-[8px] px-1 py-0.2 rounded bg-purple-500/10 text-purple-400 font-medium border border-purple-500/20">
                          Outside
                        </span>
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
                      className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black rounded-lg transition-all"
                      title="WhatsApp Chat"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {emp.phone && (
                    <a
                      href={`tel:${emp.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-black rounded-lg transition-all"
                      title="Direct Phone Call"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Area: Global Chat (Always visible on desktop, tabbed on mobile) */}
      <div
        className={`${
          mobileTab === "chat" ? "flex" : "hidden"
        } md:flex flex-1 flex-col bg-slate-950 relative`}
      >
        {/* Chat Header */}
        <div className="p-3.5 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Global Operations Channel
            </h2>
            <p className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase mt-0.5">
              Live Fleet & Site Comms
            </p>
          </div>
          <span className="text-xs text-slate-400 font-semibold">
            {messages.length} messages
          </span>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-700/60">
          {messages.map((msg, i) => {
            const isMe = msg.senderId === currentUserEmployeeId;
            const isConsecutive = i > 0 && messages[i - 1].senderId === msg.senderId;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${
                  isConsecutive ? "mt-1" : "mt-3"
                }`}
              >
                {!isConsecutive && !isMe && (
                  <div className="flex items-center gap-1.5 mb-1 ml-1">
                    <span className="text-xs font-bold text-slate-300">{msg.senderName}</span>
                    <span className="text-[9px] font-black uppercase bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                      {msg.senderRole}
                    </span>
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 shadow-md break-words ${
                    isMe
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-sm"
                      : "bg-slate-900 text-slate-100 rounded-tl-sm border border-slate-800"
                  }`}
                >
                  {msg.mediaUrl && (
                    <img
                      src={msg.mediaUrl}
                      alt="Attachment"
                      className="rounded-xl mb-2 max-h-60 object-cover w-full"
                    />
                  )}
                  {msg.text && <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>}
                  <span
                    className={`text-[9px] block text-right mt-1 ${
                      isMe ? "text-emerald-100/70" : "text-slate-400"
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-3 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shrink-0">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <button
              type="button"
              className="p-2.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-colors border border-slate-800"
              title="Attach Photo"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message to company channel..."
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={isSending || !newMessage.trim()}
              className="p-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-md transition-all disabled:opacity-40"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Flyout Profile Modal */}
      {selectedEmployee && (
        <div className="absolute right-0 top-0 bottom-0 w-full sm:w-96 bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Crew Profile Preview
            </span>
            <button
              onClick={() => setSelectedEmployee(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-700/60">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg font-black text-white shrink-0 overflow-hidden">
                {selectedEmployee.profilePhotoUrl ? (
                  <img
                    src={selectedEmployee.profilePhotoUrl}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                ) : (
                  selectedEmployee.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-black text-white truncate">
                  {selectedEmployee.name}
                </h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 uppercase">
                    {selectedEmployee.role}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      selectedEmployee.operatorType === "INTERNAL"
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : "bg-purple-500/15 text-purple-400 border-purple-500/30"
                    }`}
                  >
                    {selectedEmployee.operatorType === "INTERNAL"
                      ? "Company Worker"
                      : "Outside Worker"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {selectedEmployee.phone ? (
                <>
                  <a
                    href={`tel:${selectedEmployee.phone}`}
                    className="flex items-center justify-center gap-2 py-2 px-3 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold hover:bg-cyan-600 hover:text-white transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call (+91)
                  </a>
                  <a
                    href={`https://wa.me/${selectedEmployee.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                </>
              ) : (
                <div className="col-span-2 text-center text-xs text-slate-500 italic py-2">
                  No direct phone number listed
                </div>
              )}
            </div>

            <div className="bg-slate-950/80 rounded-2xl p-3.5 border border-slate-800 space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Wage Structure
              </span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Base Wage:</span>
                <span className="font-bold text-white">
                  ₹
                  {selectedEmployee.baseDailyWage
                    ? selectedEmployee.baseDailyWage.toLocaleString("en-IN")
                    : selectedEmployee.operatorType === "INTERNAL"
                    ? "1,100"
                    : "1,200"}{" "}
                  /day
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Daily Food Bata:</span>
                <span className="font-bold text-amber-400">
                  ₹{selectedEmployee.dailyBataRate || 0} /day
                </span>
              </div>
            </div>

            {selectedEmployee.capableRoles && selectedEmployee.capableRoles.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Qualified Job Roles ({selectedEmployee.capableRoles.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedEmployee.capableRoles.map((rId: string) => (
                    <span
                      key={rId}
                      className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-200 text-[11px] font-semibold border border-slate-700/60"
                    >
                      {rId.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setNewMessage((prev) => `@${selectedEmployee.name} ${prev}`);
                setMobileTab("chat");
              }}
              className="w-full py-2 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-colors border border-slate-700/60"
            >
              @ Mention {selectedEmployee.name} in Chat
            </button>
          </div>

          <div className="p-3.5 border-t border-slate-800 bg-slate-950/80">
            <Link
              href={`/staff/operators/${selectedEmployee.id}`}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
            >
              <span>View Full Operator Profile</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
