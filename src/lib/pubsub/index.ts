// ─── Google Cloud Pub/Sub ─────────────────────────────────────────────────────
// Initializes Pub/Sub topic publishers used for async event processing.
//
// TODO: Replace the topics below with your own, or remove this file entirely
//       if your project does not use Pub/Sub.
//
// Usage:
//   import { publishEvent } from '@/lib/pubsub'
//   await publishEvent({ type: 'USER_CREATED', payload: { userId } })

import { PubSub } from '@google-cloud/pubsub'

import logger from '@/lib/winston'

// TODO: Set EVENTS_TOPIC and EVENTS_PROJECT in your .env file
const EVENTS_TOPIC = process.env.EVENTS_TOPIC
const EVENTS_PROJECT = process.env.EVENTS_PROJECT

if (!EVENTS_TOPIC || !EVENTS_PROJECT) {
  logger.warn('[Pub/Sub] EVENTS_TOPIC or EVENTS_PROJECT not set — Pub/Sub publishing will be skipped.')
}

const pubsub = EVENTS_PROJECT ? new PubSub({ projectId: EVENTS_PROJECT }) : null
const eventsTopic = pubsub && EVENTS_TOPIC ? pubsub.topic(EVENTS_TOPIC) : null

/**
 * Publishes a JSON-serializable message to the events topic.
 * Silently skips if Pub/Sub is not configured.
 */
export const publishEvent = async (data: Record<string, unknown>): Promise<void> => {
  if (!eventsTopic) {
    logger.debug('[Pub/Sub] Skipping event publish — not configured.', data)
    return
  }

  try {
    const messageBuffer = Buffer.from(JSON.stringify(data))
    await eventsTopic.publishMessage({ data: messageBuffer })
    logger.debug('[Pub/Sub] Event published', data)
  } catch (error) {
    logger.error('[Pub/Sub] Failed to publish event', { error, data })
  }
}
