import React, { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { formatNumberToIDR, parseIDRToNumber } from '../utils/formatters';

interface AmountInputProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function AmountInput({ 
  id, 
  label, 
  value, 
  onChange, 
  placeholder = '0', 
  className = '', 
  required = false 
}: AmountInputProps) {
  const [displayValue, setDisplayValue] = useState(value > 0 ? formatNumberToIDR(value) : '');

  // Synchronize internal display value when external value changes
  useEffect(() => {
    if (value === 0) {
      setDisplayValue('');
    } else {
      const formatted = formatNumberToIDR(value);
      if (formatted !== displayValue) {
        setDisplayValue(formatted);
      }
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // Allow only digits
    const cleanValue = rawValue.replace(/[^\d]/g, '');
    
    if (cleanValue === '') {
      setDisplayValue('');
      onChange(0);
      return;
    }

    const numericValue = parseInt(cleanValue, 10);
    setDisplayValue(formatNumberToIDR(numericValue));
    onChange(numericValue);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
          Rp
        </span>
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          className="pl-10 font-medium"
        />
      </div>
    </div>
  );
}
