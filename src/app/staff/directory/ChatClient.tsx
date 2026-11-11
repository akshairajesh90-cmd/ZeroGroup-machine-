"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Sparkles,
  MessageSquare,
  Truck,
  UserCheck,
  PhoneCall,
  AtSign,
  UserCircle2,
  ArrowLeft,
  Radio
} from "lucide-react";
import { getChatMessages, sendChatMessage } from "@/actions/chat";

export type EmployeeItem = {
  id: string;
  name: string;
  role: string;
  phone?: string | null;
  profilePhotoUrl?: string | null;
  operatorType?: string | null;
  defaultCrewRole?: string | null;
  capableRoles?: string[];
  baseDailyWage?: number | null;
  dailyBataRate?: number | null;
  lastSeenAt?: string | null;
};

export type ChatMessageItem = {
  id: string;
  text?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  senderId: string;
  receiverId?: string | null;
  senderName: string;
  senderRole: string;
  senderPhoto?: string | null;
  receiverName?: string | null;
  receiverRole?: string | null;
  isPersonal?: boolean;
  createdAt: string;
};

export default function ChatClient({
  employees,
  currentUserEmployeeId,
}: {
  employees: EmployeeItem[];
  currentUserEmployeeId: string;
}) {
  const [activeTab, setActiveTab] = useState<"chat" | "directory">("chat");
  const [activeChatRecipient, setActiveChatRecipient] = useState<EmployeeItem | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeItem | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;
    let isMounted = true;

    const runPoll = async () => {
      if (!isMounted) return;
      if (typeof document !== "undefined" && document.hidden) {
        // Tab is hidden/minimized: slow down polling to 30s to spare server & mobile battery
        timerId = setTimeout(runPoll, 30000);
        return;
      }

      await fetchMessages();
      if (isMounted) {
        timerId = setTimeout(runPoll, 4000);
      }
    };

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden && isMounted) {
        if (timerId) clearTimeout(timerId);
        runPoll();
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }
    runPoll();

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [activeChatRecipient]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeTab, activeChatRecipient]);

  const fetchMessages = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const data = await getChatMessages(activeChatRecipient ? activeChatRecipient.id : null);
      setMessages(data);
    } catch (err) {
      console.error("[CHAT] Failed to fetch messages:", err);
    } finally {
      isFetchingRef.current = false;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert("File too large. Maximum size is 4MB.");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setFilePreview(objectUrl);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;

    setIsSending(true);
    const formData = new FormData();
    if (newMessage.trim()) formData.append("text", newMessage.trim());
    if (selectedFile) formData.append("file", selectedFile);
    if (activeChatRecipient) {
      formData.append("receiverId", activeChatRecipient.id);
    } else {
      formData.append("receiverId", "GROUP");
    }

    try {
      await sendChatMessage(formData);
      setNewMessage("");
      clearSelectedFile();
      await fetchMessages();
      scrollToBottom();
    } catch (err: any) {
      alert(err.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleStartPersonalChat = (emp: EmployeeItem) => {
    setActiveChatRecipient(emp);
    setActiveTab("chat");
    setSelectedEmployee(null);
  };

  const handleSwitchToGroup = () => {
    setActiveChatRecipient(null);
    setActiveTab("chat");
  };

  const handleMentionUser = (empName: string) => {
    setActiveChatRecipient(null);
    setNewMessage((prev) => (prev ? `${prev} @${empName} ` : `@${empName} `));
    setActiveTab("chat");
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.phone && emp.phone.includes(searchTerm));

    const matchesRole =
      roleFilter === "ALL" ||
      emp.role === roleFilter ||
      (roleFilter === "LEADERSHIP" && (emp.role === "OWNER" || emp.role === "ADMIN" || emp.role === "STAFF"));

    return matchesSearch && matchesRole;
  });

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

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "OWNER":
      case "ADMIN":
        return "bg-purple-500/20 text-purple-300 border-purple-500/40";
      case "STAFF":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "DRIVER":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
      case "OPERATOR":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      default:
        return "bg-slate-700 text-slate-300 border-slate-600";
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative font-sans">
      
      {/* ─── Top Switcher for Small/Medium Screens (< lg) ──────── */}
      <div className="lg:hidden p-2.5 bg-slate-900 border-b border-slate-800 shrink-0 z-10">
        <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              activeTab === "chat"
                ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{activeChatRecipient ? `Personal: ${activeChatRecipient.name.split(" ")[0]}` : "Operations Chat"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("directory")}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              activeTab === "directory"
                ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Crew Directory ({filteredEmployees.length})</span>
          </button>
        </div>
      </div>

      {/* ─── Left Column: Crew Directory & Personal Chat Contacts ──── */}
      <div
        className={`${
          activeTab === "directory" ? "flex" : "hidden"
        } lg:flex w-full lg:w-96 border-r border-slate-800 flex-col bg-slate-900/60 shrink-0`}
      >
        <div className="p-3.5 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" /> Crew & Contacts
            </h2>
            <button
              type="button"
              onClick={handleSwitchToGroup}
              className={`text-[10px] px-2 py-1 rounded-md font-bold transition-colors border ${
                activeChatRecipient === null
                  ? "bg-amber-500 text-slate-950 border-amber-400"
                  : "bg-slate-800 text-slate-300 hover:text-white border-slate-700"
              }`}
            >
              📣 Operations Channel
            </button>
          </div>

          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search crew by name, role, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-8 pr-4 py-2 text-xs text-white placeholder:text-slate-500 outline-none transition-colors"
            />
          </div>

          {/* Role Filters */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 [scrollbar-width:none]">
            {["ALL", "LEADERSHIP", "OPERATOR", "DRIVER"].map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(role)}
                className={`px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap transition-colors ${
                  roleFilter === role
                    ? "bg-amber-500 text-slate-950"
                    : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Directory List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-700/60">
          {filteredEmployees.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No crew members match your search.
            </div>
          ) : (
            filteredEmployees.map((emp) => {
              const sanitizedPhone = emp.phone?.replace(/\D/g, "") || "";
              const waPhone = sanitizedPhone.length === 10 ? `91${sanitizedPhone}` : sanitizedPhone;
              const hasWhatsApp = waPhone.length >= 10;
              const isSelected = selectedEmployee?.id === emp.id;
              const isCurrentChatPartner = activeChatRecipient?.id === emp.id;

              return (
                <div
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group ${
                    isCurrentChatPartner
                      ? "bg-amber-500/15 border border-amber-500/60 shadow-md ring-1 ring-amber-500/30"
                      : isSelected
                      ? "bg-slate-800 border border-slate-700"
                      : "hover:bg-slate-800/60 bg-slate-900/40 border border-slate-800/60"
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
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                          {emp.name}
                        </h3>
                        {isCurrentChatPartner && (
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${getRoleBadgeClass(emp.role)}`}>
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
                    {/* Personal 1-on-1 Chat button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartPersonalChat(emp);
                      }}
                      className={`p-1.5 rounded-lg transition-all text-xs flex items-center gap-1 font-bold ${
                        isCurrentChatPartner
                          ? "bg-amber-500 text-slate-950 shadow-sm"
                          : "bg-slate-800 text-amber-400 hover:bg-amber-500 hover:text-slate-950 border border-slate-700"
                      }`}
                      title={`Start Personal Chat with ${emp.name}`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>

                    {/* Quick Mention */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMentionUser(emp.name);
                      }}
                      className="p-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
                      title={`Mention ${emp.name} in operations channel`}
                    >
                      <AtSign className="w-3.5 h-3.5" />
                    </button>

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
            })
          )}
        </div>
      </div>

      {/* ─── Right Column: Active Chat Feed (Group or Personal) ──── */}
      <div
        className={`${
          activeTab === "chat" ? "flex" : "hidden"
        } lg:flex flex-1 flex-col bg-slate-950 relative min-h-0`}
      >
        {/* Dynamic Chat Header */}
        <div className="p-3.5 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {activeChatRecipient ? (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 overflow-hidden text-amber-400 font-bold">
                  {activeChatRecipient.profilePhotoUrl ? (
                    <img
                      src={activeChatRecipient.profilePhotoUrl}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    activeChatRecipient.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white">
                      {activeChatRecipient.name}
                    </h2>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${getRoleBadgeClass(activeChatRecipient.role)}`}>
                      {activeChatRecipient.role}
                    </span>
                    <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Personal Chat
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    Direct Private Messaging • {activeChatRecipient.phone || "Company Staff"}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Company Operations Channel
                </h2>
                <p className="text-[10px] text-amber-400 font-semibold tracking-wider uppercase mt-0.5">
                  Live Fleet Comms (All Crew Broadcast)
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeChatRecipient ? (
              <button
                type="button"
                onClick={handleSwitchToGroup}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>Switch to Group Channel</span>
              </button>
            ) : (
              <span className="text-xs text-slate-400 font-semibold">
                {messages.length} messages
              </span>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-700/60 min-h-0">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3">
                <MessageSquare className="h-6 w-6 text-amber-400/70" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold text-slate-300">
                {activeChatRecipient
                  ? `No personal messages with ${activeChatRecipient.name} yet`
                  : "No operations channel messages yet"}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                {activeChatRecipient
                  ? "Send a private direct message or work instructions below."
                  : "Broadcast status, site updates, or machinery instructions to the field crew."}
              </p>
            </div>
          ) : (
            messages.map((msg, i) => {
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
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${getRoleBadgeClass(msg.senderRole)}`}>
                        {msg.senderRole}
                      </span>
                      {msg.isPersonal && (
                        <span className="text-[8px] font-semibold text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded">
                          Direct
                        </span>
                      )}
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 shadow-md break-words ${
                      isMe
                        ? "bg-amber-500 text-slate-950 font-medium rounded-tr-sm"
                        : "bg-slate-900 text-slate-100 rounded-tl-sm border border-slate-800"
                    }`}
                  >
                    {msg.mediaUrl && (
                      <img
                        src={msg.mediaUrl}
                        alt="Attachment"
                        className="rounded-xl mb-2 max-h-60 object-cover w-full border border-slate-700"
                      />
                    )}
                    {msg.text && <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>}
                    <span
                      className={`text-[9px] block text-right mt-1 ${
                        isMe ? "text-slate-950/70 font-semibold" : "text-slate-400"
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
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input & Media Preview */}
        <div className="p-3 bg-slate-900/95 border-t border-slate-800 shrink-0">
          {filePreview && (
            <div className="mb-2 relative inline-block">
              <img
                src={filePreview}
                alt="Selected attachment"
                className="h-20 w-20 object-cover rounded-xl border border-amber-500/50 shadow-md"
              />
              <button
                type="button"
                onClick={clearSelectedFile}
                className="absolute -top-1.5 -right-1.5 bg-rose-600 hover:bg-rose-500 text-white p-1 rounded-full shadow"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-xl transition-colors border border-slate-800"
              title="Attach Photo"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                activeChatRecipient
                  ? `Message ${activeChatRecipient.name} directly...`
                  : "Type message to operations channel (use @ to mention)..."
              }
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={isSending || (!newMessage.trim() && !selectedFile)}
              className="p-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-md transition-all disabled:opacity-40"
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
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Crew Profile Preview
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
              <div>
                <h3 className="text-base font-bold text-white">{selectedEmployee.name}</h3>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border inline-block mt-1 ${getRoleBadgeClass(selectedEmployee.role)}`}>
                  {selectedEmployee.role}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Phone:</span>
                <span className="font-mono text-slate-300">{selectedEmployee.phone || "Not recorded"}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Classification:</span>
                <span className="text-slate-300">{selectedEmployee.operatorType || "INTERNAL"}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              {/* Start 1-on-1 Personal Chat */}
              <button
                type="button"
                onClick={() => handleStartPersonalChat(selectedEmployee)}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Start Personal Chat with {selectedEmployee.name}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleMentionUser(selectedEmployee.name);
                  setSelectedEmployee(null);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-slate-700"
              >
                <AtSign className="w-3.5 h-3.5" />
                <span>@ Mention in Channel</span>
              </button>

              {selectedEmployee.phone && (
                <a
                  href={`tel:${selectedEmployee.phone}`}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors border border-slate-700"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Call {selectedEmployee.phone}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
