"use client";

import React, { useRef, useState, useTransition, useEffect } from "react";
import useSWR from "swr";
import { getChatMessages, sendChatMessage } from "@/actions/chat";
import { Send, Image as ImageIcon, Loader2, RefreshCw, X, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function CompanyGroupChat({ currentEmployeeId }: { currentEmployeeId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // SWR Polling (15s) with a fetcher that calls our Server Action
  const fetcher = async () => await getChatMessages();
  const { data: messages, mutate, isValidating } = useSWR("company_chat", fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: true,
  });

  // Auto-scroll to bottom when messages load or a new message arrives
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      setError("File too large. Max 4MB allowed.");
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setError(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    const formData = new FormData(formRef.current!);
    
    // Opt-in UI reset for responsiveness
    formRef.current?.reset();
    clearFile();

    startTransition(async () => {
      try {
        await sendChatMessage(formData);
        await mutate(); // instantly refetch messages
// eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err: any) {
        setError(err.message || "Failed to send message");
      }
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] sm:h-[600px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between z-10">
        <div>
          <h2 className="text-white font-bold tracking-tight">Company Comm Channel</h2>
          <p className="text-xs text-slate-400">All Office & Field Staff</p>
        </div>
        <button 
          onClick={() => mutate()}
          disabled={isValidating}
          className="p-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
          title="Manually Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isValidating ? "animate-spin text-blue-400" : ""}`} />
        </button>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <p className="text-xs font-bold text-red-400">{error}</p>
          </div>
          <button onClick={() => setError(null)}><X className="w-4 h-4 text-red-400 hover:text-red-300" /></button>
        </div>
      )}

      {/* Chat Messages */}
      <div 
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {!messages ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-slate-500 text-sm mt-10">No messages yet. Say hello!</div>
        ) : (
          messages.map((msg: any) => {
            const isMe = msg.senderId === currentEmployeeId;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-1.5 mb-1 mx-1">
                  <span className="text-[10px] font-bold text-slate-400">{isMe ? "You" : msg.senderName}</span>
                  <span className="text-[9px] px-1.5 rounded-sm bg-slate-800 text-slate-500 font-mono tracking-widest uppercase">{msg.senderRole}</span>
                </div>
                
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${
                  isMe ? "bg-blue-600 text-white rounded-br-none" : "bg-slate-800 text-slate-100 rounded-bl-none"
                }`}>
                  {msg.mediaUrl && (
                    <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
                      {msg.mediaType === "VIDEO" ? (
                        <video src={msg.mediaUrl} controls className="max-h-48 w-full object-cover" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={msg.mediaUrl} alt="Attachment" className="max-h-48 w-full object-cover" />
                      )}
                    </div>
                  )}
                  {msg.text && <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>}
                </div>
                <span className="text-[9px] text-slate-500 mt-1 mx-1">
                  {format(new Date(msg.createdAt), "h:mm a")}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Media Preview before send */}
      {previewUrl && (
        <div className="bg-slate-900 border-t border-slate-800 p-3 flex items-start gap-3">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
            {selectedFile?.type.startsWith("video/") ? (
              <video src={previewUrl} className="w-full h-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            )}
            <button 
              onClick={clearFile}
              className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white hover:bg-black/90 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex flex-col justify-center text-xs">
            <span className="text-slate-300 truncate max-w-[150px] font-bold">{selectedFile?.name}</span>
            <span className="text-slate-500">{(selectedFile!.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-slate-950 p-3 border-t border-slate-800 z-10">
        <form ref={formRef} onSubmit={handleSubmit} className="flex items-end gap-2 relative">
          <input 
            type="file" 
            name="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*,video/*"
          />
          
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-slate-400 bg-slate-900 rounded-xl hover:text-white hover:bg-slate-800 transition-colors shadow-inner"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          
          <textarea 
            name="text"
            placeholder="Type a message..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 resize-none min-h-[44px] max-h-32 shadow-inner"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (formRef.current) formRef.current.requestSubmit();
              }
            }}
          />
          
          <button 
            type="submit"
            disabled={isPending}
            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all disabled:opacity-50 disabled:scale-100 active:scale-95 shadow-md shadow-blue-900/50"
          >
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
