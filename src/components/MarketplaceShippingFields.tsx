import React, { useMemo } from 'react';
import { senegalLocationData, senegalRegions } from '../data/senegalLocations';

export type MarketplaceShippingForm = {
  phone: string;
  region: string;
  department: string;
  commune: string;
  complement: string;
};

export const emptyMarketplaceShipping = (): MarketplaceShippingForm => ({
  phone: '',
  region: '',
  department: '',
  commune: '',
  complement: '',
});

/** Objet stocké en orders.shipping_address (JSONB) */
export function shippingFormToJson(form: MarketplaceShippingForm): Record<string, string> {
  return {
    phone: form.phone.trim(),
    region: form.region.trim(),
    department: form.department.trim(),
    commune: form.commune.trim(),
    complement: form.complement.trim(),
  };
}

export function validateMarketplaceShipping(form: MarketplaceShippingForm): string | null {
  const phone = form.phone.replace(/\s/g, '');
  if (phone.length < 9) {
    return 'Indiquez un numéro de téléphone valide (au moins 9 chiffres).';
  }
  if (!form.region.trim()) return 'Choisissez une région.';
  if (!form.department.trim()) return 'Choisissez un département.';
  if (!form.commune.trim()) return 'Choisissez une commune.';
  return null;
}

type Props = {
  value: MarketplaceShippingForm;
  onChange: (next: MarketplaceShippingForm) => void;
  disabled?: boolean;
  /** Pré-remplit le téléphone depuis le profil une seule fois si fourni */
  initialPhoneHint?: string | null;
};

export function MarketplaceShippingFields({
  value,
  onChange,
  disabled,
  initialPhoneHint,
}: Props) {
  const departments = useMemo(() => {
    if (!value.region || !senegalLocationData[value.region]) return [];
    return Object.keys(senegalLocationData[value.region]).sort();
  }, [value.region]);

  const communes = useMemo(() => {
    if (!value.region || !value.department) return [];
    const deps = senegalLocationData[value.region];
    if (!deps?.[value.department]) return [];
    return [...deps[value.department]].sort();
  }, [value.region, value.department]);

  const set = (patch: Partial<MarketplaceShippingForm>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-600 mb-1.5">
          Téléphone <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={initialPhoneHint ? undefined : '+221 77 …'}
          disabled={disabled}
          value={value.phone}
          onChange={(e) => set({ phone: e.target.value })}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none disabled:bg-gray-50"
        />
        <p className="text-[11px] text-gray-500 mt-1">
          Pour que le vendeur puisse vous joindre pour la livraison.
        </p>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-600 mb-1.5">
          Région <span className="text-red-500">*</span>
        </label>
        <select
          disabled={disabled}
          value={value.region}
          onChange={(e) =>
            set({ region: e.target.value, department: '', commune: '' })
          }
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none bg-white disabled:bg-gray-50"
        >
          <option value="">— Choisir —</option>
          {senegalRegions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-600 mb-1.5">
          Département <span className="text-red-500">*</span>
        </label>
        <select
          disabled={disabled || !value.region}
          value={value.department}
          onChange={(e) => set({ department: e.target.value, commune: '' })}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none bg-white disabled:bg-gray-50"
        >
          <option value="">— Choisir —</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-600 mb-1.5">
          Commune <span className="text-red-500">*</span>
        </label>
        <select
          disabled={disabled || !value.department}
          value={value.commune}
          onChange={(e) => set({ commune: e.target.value })}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none bg-white disabled:bg-gray-50"
        >
          <option value="">— Choisir —</option>
          {communes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-600 mb-1.5">
          Complément d&apos;adresse
        </label>
        <textarea
          disabled={disabled}
          value={value.complement}
          onChange={(e) => set({ complement: e.target.value })}
          placeholder="Quartier, point de repère, instructions…"
          rows={3}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none resize-none disabled:bg-gray-50"
        />
      </div>
    </div>
  );
}
