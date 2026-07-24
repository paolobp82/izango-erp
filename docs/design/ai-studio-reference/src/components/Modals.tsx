import React, { useState } from "react";
import { X, Save, Plus, DollarSign, Calendar, Globe, User, Phone, Mail, Award, MapPin } from "lucide-react";
import { CRMClient, CRMContact, CRMProject } from "../types";

// ============================================================================
// EDIT CLIENT MODAL
// ============================================================================
interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: CRMClient;
  onSave: (updatedClient: CRMClient) => void;
}

export function EditClientModal({ isOpen, onClose, client, onSave }: EditClientModalProps) {
  const [formData, setFormData] = useState<CRMClient>({ ...client });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            Editar Ficha de Cliente
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar-light">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Comercial</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">RUC</label>
              <input
                type="text"
                name="ruc"
                value={formData.ruc}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sector Industrial</label>
              <input
                type="text"
                name="sector"
                value={formData.sector}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sitio Web</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Key Account Manager</label>
              <input
                type="text"
                name="kam"
                value={formData.kam}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Desde (Fecha)</label>
              <input
                type="text"
                name="sinceDate"
                value={formData.sinceDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">LTV acumulado ($)</label>
              <input
                type="number"
                name="ltv"
                value={formData.ltv}
                onChange={(e) => setFormData(prev => ({ ...prev, ltv: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Crecimiento LTV (ej: +12% vs LY)</label>
              <input
                type="text"
                name="ltvGrowth"
                value={formData.ltvGrowth}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ubicación y Sede Principal</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Sede</label>
                <input
                  type="text"
                  name="addressName"
                  value={formData.addressName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ubicación General</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dirección Detallada</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  name="addressDetails"
                  value={formData.addressDetails}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isVIP"
              name="isVIP"
              checked={formData.isVIP}
              onChange={handleCheckboxChange}
              className="w-4 h-4 text-indigo-600 border-slate-300 rounded-xs focus:ring-indigo-500"
            />
            <label htmlFor="isVIP" className="text-sm font-semibold text-slate-700 cursor-pointer">
              Marcar como Cliente VIP (destacar visualmente)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all"
            >
              <Save className="w-4 h-4" />
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ============================================================================
// NEW OPPORTUNITY MODAL
// ============================================================================
interface NewOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (opportunityAmount: number) => void;
}

export function NewOpportunityModal({ isOpen, onClose, onAdd }: NewOpportunityModalProps) {
  const [oppAmount, setOppAmount] = useState<string>("50000");
  const [oppName, setOppName] = useState<string>("Licencias de Flota 2026");
  const [oppProb, setOppProb] = useState<number>(75);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(oppAmount);
    if (!isNaN(amount) && amount > 0) {
      onAdd(amount);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Nueva Oportunidad de Pipeline
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre de Oportunidad</label>
            <input
              type="text"
              required
              value={oppName}
              onChange={(e) => setOppName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              placeholder="Ej: Ampliación de Soporte Cloud"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monto Estimado ($ USD)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="number"
                required
                min="100"
                value={oppAmount}
                onChange={(e) => setOppAmount(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                placeholder="Ej: 45000"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Probabilidad de Cierre ({oppProb}%)</label>
            <input
              type="range"
              min="10"
              max="95"
              step="5"
              value={oppProb}
              onChange={(e) => setOppProb(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Prospección (10%)</span>
              <span>Cerrado (95%)</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              Añadir al Pipeline
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ============================================================================
// ADD CONTACT MODAL
// ============================================================================
interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (contact: CRMContact) => void;
}

export function AddContactModal({ isOpen, onClose, onAdd }: AddContactModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isKey, setIsKey] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role) return;

    onAdd({
      id: "cont-" + Date.now(),
      name,
      role,
      email,
      phone,
      avatarUrl: "", // Initials will represent them beautifully
      isKey
    });

    // Reset fields
    setName("");
    setRole("");
    setEmail("");
    setPhone("");
    setIsKey(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" />
            Añadir Contacto Clave
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Completo</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              placeholder="Ej: Mariella Thorne"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cargo / Puesto de Decisión</label>
            <input
              type="text"
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              placeholder="Ej: Gerente de Compras o TI"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email corporativo</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  placeholder="name@empresa.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  placeholder="+51 999 888 777"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isKey"
              checked={isKey}
              onChange={(e) => setIsKey(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-slate-300 rounded-xs focus:ring-indigo-500"
            />
            <label htmlFor="isKey" className="text-sm font-semibold text-slate-700 cursor-pointer">
              Contacto clave de decisión (VIP)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              Añadir Contacto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
