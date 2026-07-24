import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, X, ArrowRight, CornerDownLeft, MessageSquare, RefreshCw } from "lucide-react";
import { CRMClient } from "../types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ZigiChatWidgetProps {
  client: CRMClient;
  isOpen: boolean;
  onClose: () => void;
}

export function ZigiChatWidget({ client, isOpen, onClose }: ZigiChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat when client changes
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: `¡Hola! Soy **ZIGI AI**, tu asistente estratégico de CRM. He analizado la cuenta de **${client.name}** en el sector **${client.sector}**. 
        
¿En qué te puedo ayudar hoy? Te sugiero algunas acciones:
1. *\"Escribe una propuesta de flota híbrida 'Eco-Fleet' para Mariella Thorne\"*
2. *\"Ayúdame a preparar el correo para Carlos Ruiz sobre la reunión del Q3\"*
3. *\"Analiza el riesgo de la oportunidad estancada de $112,550\"*`,
      },
    ]);
  }, [client]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    const newMessages = [...messages, { role: "user" as const, content: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          clientContext: {
            name: client.name,
            sector: client.sector,
            kam: client.kam,
            ltv: client.ltv,
            openPipeline: client.pipelineOpen,
            recentActivities: client.activities,
            contacts: client.contacts.map(c => ({ name: c.name, role: c.role })),
            projects: client.projects.map(p => ({ name: p.name, progress: p.progress, status: p.status }))
          }
        }),
      });

      if (!response.ok) {
        throw new Error("La solicitud al servidor falló");
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.text }]);
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Disculpa, ha ocurrido un error al conectar con ZIGI AI. Verifica que el servidor esté activo y la API Key configurada.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const applySuggestion = (suggestion: string) => {
    setInput(suggestion);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-[#0d1c2d] text-slate-100 shadow-2xl border-l border-slate-800 flex flex-col animate-in slide-in-from-right duration-250">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-[#122131]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-base flex items-center gap-2 text-slate-100">
              ZIGI AI Enterprise
              <span className="text-[9px] uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold border border-emerald-500/20">
                Online
              </span>
            </h3>
            <p className="text-xs text-slate-400">Consultor Estratégico de Cuentas</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 max-w-[85%] ${
              msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
            )}
            <div>
              <div
                className={`p-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-none"
                    : "bg-[#122131] border border-slate-800 text-slate-200 rounded-tl-none"
                }`}
              >
                {msg.content}
              </div>
              <p className="text-[10px] text-slate-500 mt-1 px-1">
                {msg.role === "user" ? "Tú" : "ZIGI AI"}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 max-w-[80%] mr-auto items-center">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 animate-spin">
              <RefreshCw className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="bg-[#122131] border border-slate-800 p-4 rounded-xl text-sm text-slate-400">
              ZIGI AI está redactando un análisis estratégico de alta fidelidad...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Quick Chips */}
      <div className="px-6 py-3 border-t border-slate-800/50 bg-[#0d1c2d] space-y-2">
        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Sugerencias rápidas:</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => applySuggestion(`Redacta un correo comercial de seguimiento sobre el paquete 'Eco-Fleet' para ${client.contacts[0]?.name || "el contacto clave"}`)}
            className="text-xs bg-[#122131] hover:bg-[#1c2b3c] border border-slate-800 hover:border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-all text-left truncate max-w-full"
          >
            📧 Redactar correo 'Eco-Fleet'
          </button>
          <button
            onClick={() => applySuggestion("Dame 3 tácticas para acelerar el ciclo de ventas en el sector " + client.sector)}
            className="text-xs bg-[#122131] hover:bg-[#1c2b3c] border border-slate-800 hover:border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-all text-left truncate max-w-full"
          >
            📈 Tácticas para {client.sector}
          </button>
          <button
            onClick={() => applySuggestion(`Prepara una agenda ejecutiva para una reunión de venta cruzada con ${client.name}`)}
            className="text-xs bg-[#122131] hover:bg-[#1c2b3c] border border-slate-800 hover:border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-all text-left truncate max-w-full"
          >
            📅 Agenda ejecutiva de ventas
          </button>
        </div>
      </div>

      {/* Input area */}
      <form onSubmit={handleSend} className="p-6 border-t border-slate-800 bg-[#122131]">
        <div className="relative flex items-center">
          <input
            type="text"
            required
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregúntale a ZIGI AI algo sobre esta cuenta..."
            className="w-full bg-[#0d1c2d] border border-slate-800 text-sm text-slate-100 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-emerald-500"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-500 text-center mt-2 flex items-center justify-center gap-1">
          Presiona Enter para enviar. Respaldado por Gemini 3.5 Flash.
        </p>
      </form>
    </div>
  );
}
