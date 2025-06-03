import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { ChatMessage } from './ChatMessage';
import { chatService } from '../services/chat';
import { ChatMessage as ChatMessageType } from '../../../shared/types/chat';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Send, MessageCircle, Wallet } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface CampaignChatProps {
  campaignId: string;
}

export function CampaignChat({ campaignId }: CampaignChatProps) {
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Subscribe to messages
  useEffect(() => {
    const unsubscribe = chatService.subscribeToMessages(campaignId, (newMessages) => {
      setMessages(newMessages);
    });

    return unsubscribe;
  }, [campaignId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!publicKey) {
      toast({
        title: 'Wallet Required',
        description: 'Please connect your wallet to send messages',
        variant: 'destructive',
      });
      return;
    }

    if (!newMessage.trim()) {
      return;
    }

    if (newMessage.trim().length > 500) {
      toast({
        title: 'Message Too Long',
        description: 'Messages must be 500 characters or less',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      await chatService.sendMessage({
        campaignId,
        userAddress: publicKey.toString(),
        message: newMessage.trim(),
      });

      setNewMessage('');
      
      toast({
        title: 'Message Sent',
        description: 'Your message has been posted',
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Failed to Send',
        description: 'Could not send your message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-gray-900/50 rounded-lg border border-gray-800">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-800">
        <MessageCircle className="h-5 w-5 text-purple-400" />
        <h3 className="font-semibold text-white">Campaign Chat</h3>
        <span className="text-xs text-gray-400 ml-auto">
          {messages.length} messages
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="h-12 w-12 text-gray-600 mb-3" />
            <p className="text-gray-400 mb-2">No messages yet</p>
            <p className="text-sm text-gray-500">
              Be the first to start the conversation!
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isOwnMessage={publicKey?.toString() === message.userAddress}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800">
        {!publicKey ? (
          <div className="flex flex-col items-center space-y-3 p-4 bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-2 text-gray-400">
              <Wallet className="h-5 w-5" />
              <span className="text-sm">Connect your wallet to join the chat</span>
            </div>
            <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-pink-600 !text-white hover:!from-purple-700 hover:!to-pink-700 !font-semibold !py-2 !px-4 !rounded-lg !transition-all !duration-200" />
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              maxLength={500}
              className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-purple-500"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !newMessage.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}