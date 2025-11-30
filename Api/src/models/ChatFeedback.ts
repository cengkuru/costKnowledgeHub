import { ObjectId } from 'mongodb';
import { z } from 'zod';

/**
 * ChatFeedback Model - Captures user feedback and implicit signals from chat interactions
 * Used for quality control, hallucination detection, and continuous improvement
 */
export interface ChatFeedback {
  _id?: ObjectId;
  responseId: ObjectId;           // Which AI response this feedback is for
  sessionId: string;              // Session identifier
  userId?: ObjectId;              // Optional user ID if logged in

  // Explicit feedback
  rating: 'helpful' | 'not_helpful' | null;
  feedbackText?: string;

  // Implicit signals
  followUpAsked: boolean;
  citationClicked: boolean;
  copyClicked: boolean;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Zod schema for validation
 */
export const ChatFeedbackSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  responseId: z.instanceof(ObjectId),
  sessionId: z.string().min(1).max(200),
  userId: z.instanceof(ObjectId).optional(),

  // Explicit feedback
  rating: z.enum(['helpful', 'not_helpful']).nullable().default(null),
  feedbackText: z.string().min(1).max(2000).optional(),

  // Implicit signals
  followUpAsked: z.boolean().default(false),
  citationClicked: z.boolean().default(false),
  copyClicked: z.boolean().default(false),

  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

/**
 * Input schema for creating feedback
 */
export const CreateFeedbackSchema = ChatFeedbackSchema.partial({
  _id: true,
  createdAt: true,
  updatedAt: true
}).pick({
  responseId: true,
  sessionId: true,
  userId: true,
  rating: true,
  feedbackText: true,
  followUpAsked: true,
  citationClicked: true,
  copyClicked: true
});

/**
 * Schema for tracking implicit signals
 */
export const TrackSignalSchema = z.object({
  responseId: z.instanceof(ObjectId),
  signalType: z.enum(['citation_click', 'copy_click', 'follow_up'])
});

export type FeedbackInput = z.infer<typeof CreateFeedbackSchema>;
export type TrackSignal = z.infer<typeof TrackSignalSchema>;

/**
 * Feedback statistics
 */
export interface FeedbackStats {
  totalResponses: number;
  helpfulCount: number;
  notHelpfulCount: number;
  helpfulnessRate: number;        // 0-1
  avgCitationsClicked: number;
  avgCopyClicked: number;
  commonFeedbackTopics: string[];
  timeRange: {
    from: Date;
    to: Date;
  };
}

/**
 * Collection name
 */
export const FEEDBACK_COLLECTION = 'chat_feedback';
