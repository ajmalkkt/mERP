import React, { useState, useEffect } from 'react';

// ───────────────────────────────────────────────
// Shared field definition types
// ───────────────────────────────────────────────

/** Metadata-driven field definition (used by ErpMasterScreen) */
export interface MetaFieldDef {
  fieldName: string;
  uiControl: string; // 'text' | 'number' | 'dropdown' | 'datepicker' | 'textarea' | 'email' | 'phone'
  dataType: string;
  required: boolean;
  label: string;
  options?: { value: string; label: string }[];
  readOnly?: boolean;
  placeholder?: string;
  maxLength?: number;
}

/** Simple field definition (used by GenericMasterScreen form modals) */
export interface FormFieldDef {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'email' | 'textarea' | 'phone' | 'password';
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  maxLength?: number;
}

// ───────────────────────────────────────────────
// Mode 1: Controlled field renderer (ErpMasterScreen)
// ───────────────────────────────────────────────

interface ControlledFormProps {
  mode?: 'controlled';
  fields: MetaFieldDef[];
  formData: Record<string, any>;
  onChange: (fieldName: string, value: any) => void;
  readOnly?: boolean;
}

// ───────────────────────────────────────────────
// Mode 2: Self-managed form with submission (GenericMasterScreen)
// ───────────────────────────────────────────────

interface SubmitFormProps {
  mode: 'submit';
  fields: FormFieldDef[];
  initialValues?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void | Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

type DynamicFormProps = ControlledFormProps | SubmitFormProps;

// ───────────────────────────────────────────────
// Shared field input renderer
// ───────────────────────────────────────────────

function FieldInput({
  type,
  value,
  onChange,
  readOnly,
  disabled,
  placeholder,
  options,
  maxLength,
}: {
  type: string;
  value: any;
  onChange: (val: any) => void;
  readOnly?: boolean;
  disabled?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  maxLength?: number;
}) {
  const baseClass =
    'w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm shadow-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ' +
    'read-only:bg-slate-50 read-only:text-slate-500 disabled:bg-slate-100 disabled:cursor-not-allowed ' +
    'transition-colors duration-150';

  switch (type) {
    case 'select':
    case 'dropdown':
      return (
        <select
          value={value ?? ''}
          disabled={readOnly || disabled}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass + ' appearance-none'}
        >
          <option value="">{placeholder || 'Select...'}</option>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );

    case 'textarea':
      return (
        <textarea
          value={value ?? ''}
          readOnly={readOnly}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass + ' min-h-[80px] resize-y'}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={3}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={value ?? ''}
          readOnly={readOnly}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : '')}
          className={baseClass}
          placeholder={placeholder}
        />
      );

    case 'date':
    case 'datepicker':
      return (
        <input
          type="date"
          value={value ?? ''}
          readOnly={readOnly}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
        />
      );

    case 'email':
      return (
        <input
          type="email"
          value={value ?? ''}
          readOnly={readOnly}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
          placeholder={placeholder || 'email@example.com'}
          maxLength={maxLength}
        />
      );

    case 'password':
      return (
        <input
          type="password"
          value={value ?? ''}
          readOnly={readOnly}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
          placeholder={placeholder}
        />
      );

    case 'phone':
      return (
        <input
          type="tel"
          value={value ?? ''}
          readOnly={readOnly}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
          placeholder={placeholder || '+1 (555) 000-0000'}
          maxLength={maxLength}
        />
      );

    default: // text
      return (
        <input
          type="text"
          value={value ?? ''}
          readOnly={readOnly}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
          placeholder={placeholder}
          maxLength={maxLength}
        />
      );
  }
}

// ───────────────────────────────────────────────
// Main DynamicForm component
// ───────────────────────────────────────────────

export function DynamicForm(props: DynamicFormProps) {
  // ─── Mode: submit (self-managed form) ───
  if (props.mode === 'submit') {
    return <SubmitModeForm {...props} />;
  }

  // ─── Mode: controlled (field renderer only) ───
  const { fields, formData, onChange, readOnly } = props;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-1">
      {fields.map((field) => (
        <div key={field.fieldName} className="flex flex-col">
          <label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
            {field.label}
            {field.required && <span className="text-red-500">*</span>}
          </label>
          <FieldInput
            type={field.uiControl}
            value={formData[field.fieldName]}
            onChange={(val) => !readOnly && onChange(field.fieldName, val)}
            readOnly={readOnly || field.readOnly}
            placeholder={field.placeholder || `Enter ${field.label}`}
            options={field.options}
            maxLength={field.maxLength}
          />
        </div>
      ))}
    </div>
  );
}

// ───────────────────────────────────────────────
// SubmitModeForm — self-managed with validation
// ───────────────────────────────────────────────

function SubmitModeForm({
  fields,
  initialValues = {},
  onSubmit,
  isLoading = false,
  submitLabel = 'Save',
}: SubmitFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when initialValues change
  useEffect(() => {
    const defaults: Record<string, any> = {};
    fields.forEach((f) => {
      defaults[f.name] = initialValues[f.name] ?? '';
    });
    setFormData(defaults);
    setErrors({});
  }, [initialValues, fields]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    fields.forEach((f) => {
      if (f.required && !formData[f.name] && formData[f.name] !== 0) {
        newErrors[f.name] = `${f.label} is required`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    // Clear error on change
    if (errors[fieldName]) {
      setErrors((prev) => {
        const { [fieldName]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.name} className="flex flex-col">
          <label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
            {field.label}
            {field.required && <span className="text-red-500">*</span>}
          </label>
          <FieldInput
            type={field.type}
            value={formData[field.name]}
            onChange={(val) => handleChange(field.name, val)}
            disabled={isLoading}
            placeholder={field.placeholder || `Enter ${field.label}`}
            options={field.options}
            maxLength={field.maxLength}
          />
          {errors[field.name] && (
            <span className="text-xs text-red-500 mt-1">{errors[field.name]}</span>
          )}
        </div>
      ))}

      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading && (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export default DynamicForm;
