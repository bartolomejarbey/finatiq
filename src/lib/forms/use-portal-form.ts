"use client";

import { useCallback, useRef, useState } from "react";

export type PortalFormErrors<T extends string> = Partial<Record<T, string>>;

type RequiredField<T extends string> = {
  name: T;
  value: unknown;
  message?: string;
};

export function usePortalForm<T extends string>() {
  const [errors, setErrors] = useState<PortalFormErrors<T>>({});
  const refs = useRef<Partial<Record<T, HTMLElement | null>>>({});

  const registerRef = useCallback((name: T) => {
    return (element: HTMLElement | null) => {
      refs.current[name] = element;
    };
  }, []);

  const clearError = useCallback((name: T) => {
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }, []);

  const validateRequired = useCallback((fields: RequiredField<T>[]) => {
    const nextErrors: PortalFormErrors<T> = {};

    for (const field of fields) {
      const value = field.value;
      const isEmpty =
        value == null ||
        (typeof value === "string" && value.trim().length === 0);

      if (isEmpty) {
        nextErrors[field.name] = field.message || "Toto pole je povinné";
      }
    }

    setErrors(nextErrors);

    const firstInvalid = fields.find((field) => nextErrors[field.name]);
    if (firstInvalid) {
      refs.current[firstInvalid.name]?.focus();
      return false;
    }

    return true;
  }, []);

  const setFieldError = useCallback((name: T, message: string) => {
    setErrors((current) => ({ ...current, [name]: message }));
    refs.current[name]?.focus();
  }, []);

  const resetErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    errors,
    setErrors,
    registerRef,
    clearError,
    validateRequired,
    setFieldError,
    resetErrors,
  };
}
