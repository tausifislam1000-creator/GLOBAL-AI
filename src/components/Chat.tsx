import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Mic, Paperclip, X, Image as ImageIcon, FileText, Loader2, Globe, Plus, Copy, Download, Check, Sparkles, Trash2, Cloud, User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateChatResponse } from '../services/ai';
import mammoth from 'mammoth';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  file?: { name: string; type: string; url: string };
  isThinking?: boolean;
}

export default function Chat({ userEmail, onLogout }: { userEmail: string; onLogout: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [mode, setMode] = useState<'search' | 'claude'>('search');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveToCloud = async (msgs: Message[]) => {
    try {
      setIsCloudSyncing(true);
      const puter = (window as any).puter;
      if (puter) {
        await puter.fs.write(`global_ai_chats_${userEmail}.json`, JSON.stringify(msgs));
      }
    } catch (e) {
      console.error("Cloud save error", e);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  useEffect(() => {
    const loadFromCloud = async () => {
      try {
        const puter = (window as any).puter;
        if (puter) {
          const file = await puter.fs.read(`global_ai_chats_${userEmail}.json`);
          const text = await file.text();
          const parsed = JSON.parse(text);
          if (parsed && Array.isArray(parsed)) {
            setMessages(parsed);
          }
        }
      } catch (e) {
        console.error("No previous cloud data found", e);
      }
    };
    loadFromCloud();
  }, [userEmail]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNewChat = () => {
    setMessages([]);
    saveToCloud([]);
    setInput('');
    setSelectedFile(null);
  };

  const handleDeleteMessage = (id: string) => {
    const updated = messages.filter(m => m.id !== id);
    setMessages(updated);
    saveToCloud(updated);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (text: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GlobalAI_Response_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleVoiceInput = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        try {
          setIsLoading(true);
          const puter = (window as any).puter;
          if (!puter) throw new Error('Puter.js is not loaded.');
          
          const audioFile = new File([audioBlob], 'voice.webm', { type: 'audio/webm' });
          const transcript = await puter.ai.speech2txt(audioFile);
          
          const text = transcript?.text ?? transcript;
          if (text) {
            setInput((prev) => prev + (prev ? ' ' : '') + text);
          }
        } catch (error) {
          console.error('Speech to text error:', error);
          alert('Failed to transcribe audio.');
        } finally {
          setIsLoading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Microphone access error:', error);
      alert('Microphone access is required for voice input.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const extractTextFromDocx = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !selectedFile) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    let fileDataForApi: { data: string; mimeType: string } | undefined;
    let extractedText = '';

    if (selectedFile) {
      userMessage.file = {
        name: selectedFile.name,
        type: selectedFile.type,
        url: URL.createObjectURL(selectedFile),
      };

      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      
      if (ext === 'pdf' || selectedFile.type.startsWith('image/')) {
        const base64Url = await fileToBase64(selectedFile);
        const base64Data = base64Url.split(',')[1];
        fileDataForApi = {
          data: base64Data,
          mimeType: selectedFile.type,
        };
        userMessage.file.url = base64Url;
      } else if (ext === 'docx') {
        extractedText = await extractTextFromDocx(selectedFile);
      } else if (ext === 'txt') {
        extractedText = await selectedFile.text();
      }
    }

    const updatedMessages1 = [...messages, userMessage];
    setMessages(updatedMessages1);
    saveToCloud(updatedMessages1);
    setInput('');
    setSelectedFile(null);
    setIsLoading(true);

    const aiMessageId = (Date.now() + 1).toString();
    const updatedMessages2 = [
      ...updatedMessages1,
      { id: aiMessageId, role: 'ai' as const, content: '', isThinking: true },
    ];
    setMessages(updatedMessages2);

    try {
      let prompt = userMessage.content;
      if (extractedText) {
        prompt = `Document Content:\n${extractedText}\n\nUser Query: ${prompt || 'Analyze this document.'}`;
      }

      let responseText = '';

      if (mode === 'claude') {
        const puter = (window as any).puter;
        if (!puter) {
          throw new Error('Puter.js is not loaded.');
        }
        
        // Puter AI chat
        let text = '';
        const chat_resp = await puter.ai.chat(prompt, { model: 'claude-sonnet-4.5', stream: true });
        for await (const part of chat_resp) {
          text += part?.text || '';
          // Update message incrementally if we want, or just wait for the end.
          // For simplicity, we'll wait for the end or update it as it comes.
          const updated = updatedMessages2.map((msg) =>
            msg.id === aiMessageId
              ? { ...msg, content: text, isThinking: false }
              : msg
          );
          setMessages(updated);
          if (text === chat_resp.text) {
             // this is not strictly correct for streaming, but we'll save at the end
          }
        }
        responseText = text;
        const finalUpdated = updatedMessages2.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, content: text, isThinking: false }
            : msg
        );
        setMessages(finalUpdated);
        saveToCloud(finalUpdated);
      } else if (mode === 'search') {
        const puter = (window as any).puter;
        if (!puter) {
          throw new Error('Puter.js is not loaded.');
        }
        
        let text = '';
        const selectedModel = 'openai/gpt-5.2-chat';
        const chat_resp = await puter.ai.chat(prompt, { 
          model: selectedModel, 
          stream: true,
          tools: [{ type: 'web_search' }]
        });
        for await (const part of chat_resp) {
          text += part?.text || '';
          const updated = updatedMessages2.map((msg) =>
            msg.id === aiMessageId
              ? { ...msg, content: text, isThinking: false }
              : msg
          );
          setMessages(updated);
        }
        responseText = text;
        const finalUpdated = updatedMessages2.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, content: text, isThinking: false }
            : msg
        );
        setMessages(finalUpdated);
        saveToCloud(finalUpdated);
      } else {
        responseText = await generateChatResponse(
          prompt,
          fileDataForApi,
          false,
          false
        );
        
        const finalUpdated = updatedMessages2.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, content: responseText, isThinking: false }
            : msg
        );
        setMessages(finalUpdated);
        saveToCloud(finalUpdated);
      }
    } catch (error) {
      const finalUpdated = updatedMessages2.map((msg) =>
        msg.id === aiMessageId
          ? { ...msg, content: 'Sorry, I encountered an error processing your request.', isThinking: false }
          : msg
      );
      setMessages(finalUpdated);
      saveToCloud(finalUpdated);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white relative font-sans">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/30 rounded-full mix-blend-screen filter blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear', delay: 5 }}
          className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-900/20 rounded-full mix-blend-screen filter blur-[120px]"
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 w-full z-50 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ rotate: -180, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20"
            >
              <span className="text-lg font-bold text-white tracking-tighter">GAI</span>
            </motion.div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">GLOBAL AI</h1>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Powered by Tausif Islam</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isCloudSyncing && (
              <div className="hidden md:flex items-center gap-1 text-xs text-emerald-400">
                <Cloud className="w-3 h-3 animate-pulse" /> Syncing...
              </div>
            )}
            <button onClick={handleNewChat} className="text-xs flex items-center gap-1 text-zinc-300 hover:text-white bg-zinc-800/50 hover:bg-zinc-700 px-3 py-1.5 rounded-full transition-all">
              <Plus className="w-3 h-3" /> <span className="hidden sm:inline">New Chat</span>
            </button>
            <button onClick={onLogout} className="text-xs text-zinc-500 hover:text-white transition-colors">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 w-full z-10 relative">
        <div className="max-w-4xl mx-auto w-full p-4 md:p-8 pb-40">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center mt-20">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="mb-8"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 via-purple-500 to-emerald-500 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-indigo-500/30 mb-6 relative overflow-hidden">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 bg-[url('https://picsum.photos/seed/globalai/400/400')] opacity-50 mix-blend-overlay"
                />
                <span className="text-4xl font-black text-white tracking-tighter relative z-10">GAI</span>
              </div>
              <motion.h2 
                animate={{ 
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-emerald-400 to-indigo-400 bg-[length:200%_auto] mb-2"
              >
                Welcome
              </motion.h2>
              <p className="text-zinc-400">How can I help you today?</p>
            </motion.div>

            <div className="flex gap-2 bg-zinc-900/50 p-1 rounded-full border border-white/5 backdrop-blur-sm">
              <button
                onClick={() => setMode('search')}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${mode === 'search' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Globe className="w-4 h-4" /> Search
              </button>
              <button
                onClick={() => setMode('claude')}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${mode === 'claude' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Sparkles className="w-4 h-4" /> Claude 4.5
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 ${
                    msg.role === 'user' 
                      ? 'bg-zinc-800 border border-white/10' 
                      : 'bg-gradient-to-br from-indigo-500 to-emerald-500 shadow-lg shadow-indigo-500/20'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4 text-zinc-300" /> : <Bot className="w-4 h-4 text-white" />}
                  </div>

                  <div
                    className={`max-w-[85%] md:max-w-[75%] rounded-3xl p-5 ${
                      msg.role === 'user'
                        ? 'bg-zinc-800/80 text-white rounded-tr-sm border border-white/5 shadow-md'
                        : 'bg-zinc-900/50 border border-white/5 text-zinc-200 rounded-tl-sm backdrop-blur-md shadow-md'
                    }`}
                  >
                    {msg.file && (
                      <div className="mb-3 bg-black/30 rounded-xl p-2 flex items-center gap-3">
                        {msg.file.type.startsWith('image/') ? (
                          <img src={msg.file.url} alt="upload" className="w-12 h-12 object-cover rounded-lg" />
                        ) : (
                          <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center">
                            <FileText className="w-6 h-6 text-zinc-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{msg.file.name}</p>
                          <p className="text-xs text-zinc-500 uppercase">{msg.file.type.split('/')[1] || 'FILE'}</p>
                        </div>
                      </div>
                    )}
                    
                    {msg.isThinking ? (
                      <div className="flex items-center gap-2 text-zinc-400 py-1">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                          className="w-2 h-2 bg-emerald-400 rounded-full"
                        />
                        <motion.div
                          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                          className="w-2 h-2 bg-emerald-400 rounded-full"
                        />
                        <motion.div
                          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                          className="w-2 h-2 bg-emerald-400 rounded-full"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                        {msg.role === 'ai' && (
                          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/10">
                            <button
                              onClick={() => handleCopy(msg.id, msg.content)}
                              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                            >
                              {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedId === msg.id ? 'Copied!' : 'Copy'}
                            </button>
                            <button
                              onClick={() => handleDownload(msg.content)}
                              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors ml-auto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
                        {msg.role === 'user' && (
                          <div className="flex justify-end mt-2">
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="flex items-center gap-1 text-xs text-red-400/70 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}
        </div>
      </main>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#050505] via-[#050505]/90 to-transparent z-40 pt-20 pb-6 px-4">
        <div className="max-w-4xl mx-auto w-full">
          <motion.div 
            layout
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-2 shadow-2xl flex flex-col gap-2 focus-within:border-indigo-500/50 focus-within:shadow-indigo-500/10 transition-all duration-300"
          >
          <AnimatePresence>
            {selectedFile && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 px-3 py-2 bg-zinc-800/50 rounded-2xl mx-1 mt-1"
              >
                {selectedFile.type.startsWith('image/') ? (
                  <ImageIcon className="w-5 h-5 text-indigo-400" />
                ) : (
                  <FileText className="w-5 h-5 text-emerald-400" />
                )}
                <span className="text-sm text-zinc-300 truncate flex-1">{selectedFile.name}</span>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-1 hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="flex items-end gap-2 px-2 pb-1">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors shrink-0"
            >
              <Paperclip className="w-5 h-5" />
            </motion.button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.docx,.txt"
            />
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Global AI..."
              className="flex-1 bg-transparent text-white placeholder:text-zinc-500 resize-none max-h-32 min-h-[44px] py-3 focus:outline-none"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />

            <div className="flex items-center gap-1 shrink-0">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={handleVoiceInput}
                className={`p-3 rounded-full transition-all ${
                  isRecording 
                    ? 'bg-red-500/20 text-red-500 animate-pulse' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Mic className="w-5 h-5" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={(!input.trim() && !selectedFile) || isLoading}
                className="p-3 bg-white text-black rounded-full hover:bg-zinc-200 disabled:opacity-50 disabled:hover:bg-white transition-all shadow-lg"
              >
                <Send className="w-5 h-5" />
              </motion.button>
            </div>
          </form>
        </motion.div>
        </div>
      </div>
    </div>
  );
}
