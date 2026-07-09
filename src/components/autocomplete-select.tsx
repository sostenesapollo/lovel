"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

export type AutocompleteOption = {
  value: string;
  label: string;
};

type AutocompleteSelectProps = {
  value: string;
  options: AutocompleteOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  emptyLabel?: string;
  allowClear?: boolean;
  id?: string;
};

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function AutocompleteSelect({
  value,
  options,
  onChange,
  placeholder = "Buscar…",
  required = false,
  disabled = false,
  emptyLabel = "Nenhum resultado",
  allowClear = true,
  id,
}: AutocompleteSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return options;
    return options.filter(
      (o) => normalize(o.label).includes(q) || normalize(o.value).includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) setQuery(selected?.label ?? "");
  }, [open, selected]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery(selected?.label ?? "");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, selected]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  function pick(option: AutocompleteOption) {
    onChange(option.value);
    setQuery(option.label);
    setOpen(false);
  }

  function clear() {
    onChange("");
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (open && filtered[highlight]) {
        e.preventDefault();
        pick(filtered[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery(selected?.label ?? "");
    }
  }

  return (
    <div className="admin-autocomplete" ref={rootRef}>
      <div className="admin-autocomplete__control">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-required={required || undefined}
          disabled={disabled}
          placeholder={placeholder}
          value={open ? query : (selected?.label ?? query)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (value && e.target.value !== selected?.label) onChange("");
          }}
          onFocus={() => {
            setOpen(true);
            setQuery(selected?.label ?? "");
          }}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />
        {allowClear && value && !disabled ? (
          <button
            type="button"
            className="admin-autocomplete__clear"
            aria-label="Limpar"
            onClick={clear}
          >
            ×
          </button>
        ) : null}
        <button
          type="button"
          className="admin-autocomplete__chevron"
          tabIndex={-1}
          aria-label={open ? "Fechar lista" : "Abrir lista"}
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
        >
          ▾
        </button>
      </div>
      {open && !disabled ? (
        <ul id={listId} role="listbox" className="admin-autocomplete__list">
          {filtered.length === 0 ? (
            <li className="admin-autocomplete__empty">{emptyLabel}</li>
          ) : (
            filtered.map((option, i) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={
                    "admin-autocomplete__option" +
                    (i === highlight ? " admin-autocomplete__option--active" : "") +
                    (option.value === value ? " admin-autocomplete__option--selected" : "")
                  }
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(option)}
                >
                  {option.label}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
      {required ? (
        <input
          tabIndex={-1}
          aria-hidden
          required
          value={value}
          onChange={() => undefined}
          className="admin-autocomplete__native"
        />
      ) : null}
    </div>
  );
}
