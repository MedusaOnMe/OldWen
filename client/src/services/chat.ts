import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  limit,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChatMessage, ChatMessageInput } from '../../../shared/types/chat';

const CHAT_COLLECTION = 'chatMessages';
const MESSAGE_LIMIT = 100;

export class ChatService {
  // Send a new message
  static async sendMessage(messageInput: ChatMessageInput): Promise<string> {
    try {
      const messageData = {
        campaignId: messageInput.campaignId,
        userAddress: messageInput.userAddress,
        message: messageInput.message.trim(),
        timestamp: Date.now(),
        createdAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, CHAT_COLLECTION), messageData);
      return docRef.id;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }

  // Subscribe to messages for a campaign
  static subscribeToMessages(
    campaignId: string, 
    callback: (messages: ChatMessage[]) => void
  ): () => void {
    
    const q = query(
      collection(db, CHAT_COLLECTION),
      where('campaignId', '==', campaignId),
      orderBy('timestamp', 'desc'),
      limit(MESSAGE_LIMIT)
    );

    return onSnapshot(q, (snapshot) => {
      const messages: ChatMessage[] = [];
      
      snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          campaignId: data.campaignId,
          userAddress: data.userAddress,
          message: data.message,
          timestamp: data.timestamp,
          createdAt: data.createdAt?.toDate() || new Date(data.timestamp)
        });
      });

      // Reverse to show oldest first
      callback(messages.reverse());
    }, (error) => {
      console.error('Error listening to messages:', error);
      callback([]);
    });
  }
}

export { ChatService as chatService };