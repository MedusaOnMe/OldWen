export interface ChatMessage {
  id: string;
  campaignId: string;
  userAddress: string;
  message: string;
  timestamp: number;
  createdAt: Date;
}

export interface ChatMessageInput {
  campaignId: string;
  userAddress: string;
  message: string;
}