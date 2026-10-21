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
  MessageSquare,
  X,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Truck,
  Sparkles,
  PhoneCall,
  UserCheck
} from "lucide-react";
import { getChatMessages, sendChatMessage } from "@/actions/chat";

type EmployeeItem = {
  id: string;
  name: string;
  role: string;
  phone?: string | null;
  profilePhotoUrl?: string | null;
  employeeCode?: string | null;
};

type ChatMessageItem = {
  id: string;
  text?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  senderId: string;
  senderName: string;
  senderRole: string;
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
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === "chat") {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  const fetchMessages = async () => {
    try {
      const data = await getChatMessages();
      setMessages(data);
    } catch (err) {
      console.error("[CHAT] Failed to fetch messages:", err);
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

    try {
      await sendChatMessage(formData);
      setNewMessage("");
      clearSelectedFile();
      await fetchMessages();
      scrollToBottom();
    } catch (err: any) {
      console.error("[CHAT] Send error:", err);
      alert(err.message || "Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const handleMentionUser = (empName: string) => {
    setNewMessage((prev) => (prev ? `${prev} @${empName} ` : `@${empName} `));
    setActiveTab("chat");
  };

  // Filter employees
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
    <div className="flex flex-col h-full w-full bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl relative font-sans">
      {/* Top Mobile-First Header & Segmented Switcher */}
      <div className="p-3 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md flex flex-col gap-2 shrink-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black tracking-wider uppercase text-slate-200">
              Operations Hub
            </span>
          </div>

          <div className="text-[11px] font-semibold text-slate-400">
            {messages.length} messages • {employees.length} crew
          </div>
        </div>

        {/* Segmented Tab Controls */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              activeTab === "chat"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Group Chat</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("directory")}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              activeTab === "directory"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-900/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Crew Directory</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-cyan-300 font-bold border border-slate-700">
              {employees.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden bg-slate-950">
        {/* TAB 1: GROUP CHAT */}
        {activeTab === "chat" && (
          <div className="flex-1 flex flex-col h-full min-h-0">
            {/* Messages Scroll Area */}
            <div
              className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700/60 [&::-webkit-scrollbar-thumb]:rounded-full"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3">
                    <MessageSquare className="h-6 w-6 text-emerald-400/60" />
                  </div>
                  <p className="text-sm font-semibold text-slate-300">No messages yet</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Start communication with office staff, site operators, and dispatch leaders below.
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
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-xs font-bold text-slate-300">
                            {msg.senderName}
                          </span>
                          <span
                            className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${getRoleBadgeClass(
                              msg.senderRole
                            )}`}
                          >
                            {msg.senderRole}
                          </span>
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-md break-words ${
                          isMe
                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-sm"
                            : "bg-slate-900/90 text-slate-100 border border-slate-800/80 rounded-tl-sm backdrop-blur-sm"
                        }`}
                      >
                        {msg.mediaUrl && (
                          <div className="mb-2 overflow-hidden rounded-xl border border-white/10">
                            <img
                              src={msg.mediaUrl}
                              alt="Attachment"
                              className="w-full max-h-64 object-cover hover:scale-105 transition-transform"
                            />
                          </div>
                        )}

                        {msg.text && (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed select-text">
                            {msg.text}
                          </p>
                        )}

                        <span
                          className={`text-[10px] font-medium block text-right mt-1 ${
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
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Image Preview Banner */}
            {filePreview && (
              <div className="px-3 py-2 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="h-10 w-10 rounded-lg object-cover border border-slate-700"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {selectedFile?.name}
                    </p>
                    <p className="text-[10px] text-slate-400">Ready to send</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearSelectedFile}
                  className="p-1 rounded-full text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Input Form */}
            <div className="p-2.5 sm:p-3 bg-slate-900/95 border-t border-slate-800/90 backdrop-blur-xl shrink-0">
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
                  className={`p-2.5 rounded-xl border transition-colors shrink-0 ${
                    selectedFile
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                      : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                  title="Attach Photo or Document"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message to crew..."
                  className="flex-1 min-w-0 bg-slate-950/90 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-colors"
                />

                <button
                  type="submit"
                  disabled={isSending || (!newMessage.trim() && !selectedFile)}
                  className="p-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {isSending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: CREW DIRECTORY */}
        {activeTab === "directory" && (
          <div className="flex-1 flex flex-col h-full min-h-0 bg-slate-950">
            {/* Search & Filter Header */}
            <div className="p-3 bg-slate-900/60 border-b border-slate-800/80 shrink-0 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search crew by name, role, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 outline-none"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Role Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {["ALL", "LEADERSHIP", "OPERATOR", "DRIVER"].map((roleKey) => (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => setRoleFilter(roleKey)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-colors ${
                      roleFilter === roleKey
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                        : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200"
                    }`}
                  >
                    {roleKey === "LEADERSHIP" ? "Staff & Admin" : roleKey}
                  </button>
                ))}
              </div>
            </div>

            {/* Employee List Scroll Area */}
            <div
              className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2 [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700/60 [&::-webkit-scrollbar-thumb]:rounded-full"
            >
              {filteredEmployees.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <p className="text-sm font-semibold text-slate-400">No crew members found</p>
                  <p className="text-xs text-slate-500 mt-1">Try another search keyword</p>
                </div>
              ) : (
                filteredEmployees.map((emp) => {
                  const rawPhone = emp.phone || "";
                  const digits = rawPhone.replace(/\D/g, "");
                  const last10 = digits.slice(-10);
                  const waNumber = last10 ? `91${last10}` : "";
                  const telUrl = last10 ? `tel:${last10}` : "";

                  return (
                    <div
                      key={emp.id}
                      className="p-3 bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 rounded-xl flex items-center justify-between gap-3 transition-colors"
                    >
                      {/* Left: Avatar & Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                          {emp.profilePhotoUrl ? (
                            <img
                              src={emp.profilePhotoUrl}
                              alt={emp.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            getRoleIcon(emp.role)
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                              {emp.name}
                            </h4>
                            <span
                              className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${getRoleBadgeClass(
                                emp.role
                              )}`}
                            >
                              {emp.role}
                            </span>
                          </div>

                          <p className="text-[11px] font-medium text-slate-400 mt-0.5 truncate">
                            {rawPhone ? (
                              <span>📱 {rawPhone}</span>
                            ) : (
                              <span className="text-slate-600">No phone linked</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Right: Quick Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Mention in Chat Button */}
                        <button
                          type="button"
                          onClick={() => handleMentionUser(emp.name)}
                          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors"
                          title={`Mention ${emp.name} in chat`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        {/* WhatsApp Button */}
                        {waNumber ? (
                          <a
                            href={`https://wa.me/${waNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-black border border-emerald-500/30 transition-all"
                            title={`Chat on WhatsApp: +${waNumber}`}
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        ) : null}

                        {/* Direct Call Button */}
                        {telUrl ? (
                          <a
                            href={telUrl}
                            className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500 hover:text-black border border-cyan-500/30 transition-all"
                            title={`Call ${emp.name}: ${last10}`}
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
