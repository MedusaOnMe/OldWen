import React, { useState, useCallback } from 'react';
import { ExternalLink, AlertCircle, Check } from 'lucide-react';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';

interface SocialLinkInputProps {
  icon: 'telegram' | 'twitter' | 'website';
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const VALIDATION_PATTERNS = {
  telegram: /^https:\/\/(t\.me|telegram\.me)\/[a-zA-Z0-9_]{5,32}$/,
  twitter: /^https:\/\/(twitter\.com|x\.com)\/[a-zA-Z0-9_]{1,15}$/,
  website: /^https?:\/\/(www\.)?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
};

const ICONS = {
  telegram: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  ),
  twitter: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  website: <ExternalLink className="h-5 w-5" />
};

const EXAMPLE_URLS = {
  telegram: 'https://t.me/your_channel',
  twitter: 'https://twitter.com/your_handle',
  website: 'https://your-website.com'
};

export const SocialLinkInput: React.FC<SocialLinkInputProps> = ({
  icon,
  placeholder,
  value,
  onChange,
  className = ''
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  const validateUrl = useCallback((url: string): boolean => {
    if (!url.trim()) {
      setError(null);
      setIsValid(null);
      return true; // Empty is valid for optional fields
    }

    const pattern = VALIDATION_PATTERNS[icon];
    const isValidFormat = pattern.test(url);
    
    if (!isValidFormat) {
      switch (icon) {
        case 'telegram':
          setError('Please enter a valid Telegram URL (e.g., https://t.me/your_channel)');
          break;
        case 'twitter':
          setError('Please enter a valid Twitter/X URL (e.g., https://twitter.com/your_handle)');
          break;
        case 'website':
          setError('Please enter a valid website URL (e.g., https://your-website.com)');
          break;
      }
      setIsValid(false);
      return false;
    }

    setError(null);
    setIsValid(true);
    return true;
  }, [icon]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Debounced validation
    const timeoutId = setTimeout(() => {
      validateUrl(newValue);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [onChange, validateUrl]);

  const handleBlur = useCallback(() => {
    validateUrl(value);
  }, [value, validateUrl]);

  const getIconColor = (): string => {
    if (isValid === true) return 'text-green-400';
    if (isValid === false) return 'text-red-400';
    return 'text-white/70';
  };

  const getBorderColor = (): string => {
    if (isValid === true) return 'border-green-500/50 focus:border-green-500';
    if (isValid === false) return 'border-red-500/50 focus:border-red-500';
    return 'border-white/30 focus:border-purple-500';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <div className={`transition-colors duration-200 ${getIconColor()}`}>
            {ICONS[icon]}
          </div>
        </div>

        <Input
          type="url"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`
            pl-12 pr-10 py-3 bg-white/10 backdrop-blur-sm border-2 transition-all duration-200
            text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50
            ${getBorderColor()}
          `}
        />

        {isValid !== null && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {isValid ? (
              <Check className="h-5 w-5 text-green-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400" />
            )}
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="bg-red-500/20 border-red-500/50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-200 text-sm">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {!value && !error && (
        <p className="text-gray-400 text-xs">
          Example: {EXAMPLE_URLS[icon]}
        </p>
      )}
    </div>
  );
};

export default SocialLinkInput;