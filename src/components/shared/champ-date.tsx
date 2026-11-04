"use client";

import { useState } from "react";
import { DateInput } from "@mantine/dates";
import { CalendarDays } from "lucide-react";

/**
 * Champ date en français (jj/mm/aaaa, calendrier en français), à la place du
 * champ natif du navigateur qui s'affichait en anglais (mm/dd/yyyy).
 *
 * La valeur transmise au formulaire reste au format ISO (AAAA-MM-JJ), via le
 * champ caché que Mantine génère à partir de `name` : les Server Actions et
 * les filtres d'URL n'ont rien à changer.
 */
export function ChampDate({
  name,
  label,
  defaultValue,
  required,
  clearable = true,
  maxDate,
  w,
}: {
  name: string;
  label: string;
  /** Date ISO (AAAA-MM-JJ) ; vide ou absente = pas de date. */
  defaultValue?: string | null;
  required?: boolean;
  clearable?: boolean;
  /** Date ISO maximale sélectionnable. */
  maxDate?: string;
  w?: number | string;
}) {
  const [valeur, setValeur] = useState<string | null>(
    defaultValue && /^\d{4}-\d{2}-\d{2}$/.test(defaultValue) ? defaultValue : null,
  );

  return (
    <DateInput
      name={name}
      label={label}
      value={valeur}
      onChange={setValeur}
      valueFormat="DD/MM/YYYY"
      placeholder="jj/mm/aaaa"
      required={required}
      clearable={clearable && !required}
      maxDate={maxDate}
      leftSection={<CalendarDays size={16} />}
      w={w ?? 170}
      popoverProps={{ withinPortal: true }}
    />
  );
}
