import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("paddle-signature") || "";

    if (!process.env.PADDLE_API_KEY || !process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET) {
      console.warn("Paddle credentials not configured - webhook processing disabled");
      return NextResponse.json({ received: true, note: "Credentials not configured" });
    }

    let eventData: any;
    try {
      const { Paddle } = await import("@paddle/paddle-node-sdk");
      const paddle = new Paddle(process.env.PADDLE_API_KEY);
      
      eventData = await paddle.webhooks.unmarshal(
        body,
        process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET,
        signature
      );
      
      if (!eventData || !eventData.data) {
        throw new Error("Invalid event data structure");
      }
    } catch (verifyError) {
      console.error("Webhook signature verification failed:", verifyError);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const existing = await prisma.transaction.findUnique({
      where: { id: eventData.data.id || `tx-${Date.now()}` },
    });
    
    if (!existing) {
      await prisma.transaction.create({
        data: {
          id: eventData.data.id || `tx-${Date.now()}`,
          songId: eventData.data.custom_data?.songId || null,
          userId: eventData.data.custom_data?.userId || null,
          amount: eventData.data.details?.totals?.total || "0",
          currency: eventData.data.currency_code || "USD",
          status: eventData.data.status || eventData.eventType,
          paddleData: JSON.stringify(eventData.data),
        },
      });
    } else {
      console.log(`Transaction ${eventData.data.id} already processed - skipping`);
      return NextResponse.json({ received: true, note: "Already processed" });
    }

    switch (eventData.eventType) {
      case "transaction.completed":
        await handleTransactionCompleted(eventData.data);
        break;

      case "subscription.created":
        await handleSubscriptionCreated(eventData.data);
        break;

      case "subscription.updated":
        await handleSubscriptionUpdated(eventData.data);
        break;

      case "subscription.canceled":
        await handleSubscriptionCanceled(eventData.data);
        break;

      default:
        console.log(`Unhandled event type: ${eventData.eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 400 }
    );
  }
}

async function handleTransactionCompleted(transaction: any) {
  console.log("Transaction completed:", transaction.id);
  
  if (!transaction.custom_data) {
    console.warn("No custom_data in transaction - skipping fulfillment");
    return;
  }
  
  const { songId, userId } = transaction.custom_data;
  
  if (songId) {
    const song = await prisma.song.findUnique({ where: { id: songId } });
    
    if (!song) {
      console.error(`Song ${songId} not found for transaction ${transaction.id}`);
      return;
    }
    
    if (song.isPurchased) {
      console.log(`Song ${songId} already purchased - skipping`);
      return;
    }
    
    await prisma.song.update({
      where: { id: songId },
      data: {
        isPurchased: true,
        purchaseTransactionId: transaction.id,
        userId: userId || null,
      },
    });
    
    console.log(`Song ${songId} unlocked for user ${userId || 'anonymous'}`);
  }
}

async function handleSubscriptionCreated(subscription: any) {
  console.log("Subscription created:", subscription.id);
}

async function handleSubscriptionUpdated(subscription: any) {
  console.log("Subscription updated:", subscription.id);
}

async function handleSubscriptionCanceled(subscription: any) {
  console.log("Subscription canceled:", subscription.id);
}
