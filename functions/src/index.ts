import {initializeApp} from "firebase-admin/app";
import {FieldValue, Timestamp, getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions";
import {defineSecret} from "firebase-functions/params";
import {onRequest} from "firebase-functions/v2/https";

import {
  verifyMetaSignature,
  verifyWebhookChallenge,
  webhookEventId,
} from "./metaWebhook.js";

initializeApp();

const db = getFirestore();
const metaWebhookVerifyToken = defineSecret("META_WEBHOOK_VERIFY_TOKEN");
const metaAppSecret = defineSecret("META_APP_SECRET");

export const metaInstagramWebhook = onRequest(
  {
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 30,
    invoker: "public",
    secrets: [metaWebhookVerifyToken, metaAppSecret],
  },
  async (request, response) => {
    if (request.method === "GET") {
      const result = verifyWebhookChallenge(
        request.query,
        metaWebhookVerifyToken.value(),
      );

      if (!result.ok) {
        logger.warn("Meta webhook verification rejected", {
          status: result.status,
          hasMode: typeof request.query["hub.mode"] === "string",
          hasToken: typeof request.query["hub.verify_token"] === "string",
          hasChallenge: typeof request.query["hub.challenge"] === "string",
        });
        response.status(result.status).send(result.message);
        return;
      }

      response.status(200).send(result.challenge);
      return;
    }

    if (request.method !== "POST") {
      response.set("Allow", "GET, POST").status(405).send("Method not allowed");
      return;
    }

    const signature = request.get("x-hub-signature-256");
    if (!verifyMetaSignature(request.rawBody, signature, metaAppSecret.value())) {
      logger.warn("Rejected Meta webhook with an invalid signature");
      response.status(401).send("Invalid signature");
      return;
    }

    const eventId = webhookEventId(request.rawBody);
    const eventRef = db.collection("metaInstagramWebhookEvents").doc(eventId);
    let duplicate = false;

    await db.runTransaction(async (transaction) => {
      const existingEvent = await transaction.get(eventRef);
      if (existingEvent.exists) {
        duplicate = true;
        return;
      }

      transaction.create(eventRef, {
        provider: "meta",
        object: typeof request.body?.object === "string" ? request.body.object : null,
        payload: request.body,
        status: "received",
        receivedAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    });

    logger.info("Meta Instagram webhook received", {eventId, duplicate});
    response.status(200).send("EVENT_RECEIVED");
  },
);
