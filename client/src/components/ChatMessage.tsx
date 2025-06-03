import React from 'react';
import { ChatMessage as ChatMessageType } from '../../../shared/types/chat';
import { formatDistanceToNow } from 'date-fns';
import { Wallet } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
  isOwnMessage: boolean;
}

export function ChatMessage({ message, isOwnMessage }: ChatMessageProps) {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-600">
          <Wallet className="h-4 w-4 text-white" />
        </div>
      </div>
      
      <div className="flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-purple-400">
            {isOwnMessage ? 'You' : formatAddress(message.userAddress)}
          </span>
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
          </span>
        </div>
        
        <div className="text-gray-200">
          <p className="text-sm leading-relaxed">{message.message}</p>
        </div>
      </div>
    </div>
  );
}