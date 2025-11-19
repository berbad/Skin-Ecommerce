import express, { Request, Response } from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import Order from "../../models/Order";
import { sendReceiptEmail } from "../../utils/mailer";

dotenv.config();

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {});

const sendAdminNotification = async (orderDetails: {
  customerEmail: string;
  customerName: string;
  shippingAddress: any;
  items: any[];
  total: number;
  orderId: string;
}) => {
  const adminEmail = process.env.ADMIN_EMAIL || "eternalbotanic@gmail.com";

  console.log("📧 Preparing admin notification for:", adminEmail);

  const itemsList = orderDetails.items
    .map(
      (item) =>
        `<li>${item.name} × ${item.quantity} — $${(
          item.price * item.quantity
        ).toFixed(2)}</li>`
    )
    .join("");

  const addressHtml = orderDetails.shippingAddress
    ? `
      <p><strong>Shipping Address:</strong></p>
      <p>
        ${orderDetails.shippingAddress.line1 || ""}<br/>
        ${
          orderDetails.shippingAddress.line2
            ? orderDetails.shippingAddress.line2 + "<br/>"
            : ""
        }
        ${orderDetails.shippingAddress.city || ""}, ${
        orderDetails.shippingAddress.state || ""
      } ${orderDetails.shippingAddress.postal_code || ""}<br/>
        ${orderDetails.shippingAddress.country || ""}
      </p>
    `
    : "<p><em>⚠️ No shipping address provided by Stripe</em></p>";

  const adminHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d946ef;">🎉 New Order Received!</h2>
      <p><strong>Order ID:</strong> ${orderDetails.orderId}</p>
      <hr style="border: 1px solid #e5e7eb;"/>
      
      <h3>Customer Information</h3>
      <p><strong>Name:</strong> ${orderDetails.customerName || "N/A"}</p>
      <p><strong>Email:</strong> ${orderDetails.customerEmail}</p>
      
      ${addressHtml}
      
      <h3>Order Details</h3>
      <ul style="list-style-type: none; padding: 0;">
        ${itemsList}
      </ul>
      
      <p style="font-size: 18px;"><strong>Total: $${orderDetails.total.toFixed(
        2
      )}</strong></p>
      
      <hr style="border: 1px solid #e5e7eb; margin-top: 30px;"/>
      <p style="color: #6b7280; font-size: 12px;">
        This notification was sent from your Eternal Botanic store.<br/>
        Order Date: ${new Date().toLocaleString()}
      </p>
    </div>
  `;

  try {
    await sendReceiptEmail(
      adminEmail,
      `🛍️ New Order #${orderDetails.orderId.slice(-8)}`,
      adminHtml
    );
    console.log("✅ Admin notification sent successfully to:", adminEmail);
  } catch (err: any) {
    console.error("❌ Failed to send admin notification:", err.message);
  }
};

router.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response): Promise<void> => {
    const sig = req.headers["stripe-signature"] as string;

    if (!sig) {
      console.error("❌ No stripe-signature header found");
      res.status(400).send("Missing stripe-signature header");
      return;
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET as string
      );
      console.log("✅ Webhook verified:", event.type, "ID:", event.id);
    } catch (err: any) {
      console.error("❌ Webhook signature verification failed:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      console.log("💳 Processing checkout session:", session.id);
      console.log("Customer email:", session.customer_details?.email);
      console.log("Customer name:", session.customer_details?.name);

      try {
        const lineItems = await stripe.checkout.sessions.listLineItems(
          session.id,
          { limit: 100 }
        );

        const userId = session.metadata?.userId || "guest";

        const items = lineItems.data.map((item) => ({
          productId: (item.price?.product as string) || "unknown",
          name: item.description || "Unknown Product",
          quantity: item.quantity || 1,
          price: item.amount_total ? item.amount_total / 100 : 0,
        }));

        const total =
          session.amount_total && session.currency === "usd"
            ? session.amount_total / 100
            : 0;

        const shippingDetails = (session as any).shipping_details;
        const shippingAddress = shippingDetails?.address
          ? {
              line1: shippingDetails.address.line1 || "",
              line2: shippingDetails.address.line2 || "",
              city: shippingDetails.address.city || "",
              state: shippingDetails.address.state || "",
              postal_code: shippingDetails.address.postal_code || "",
              country: shippingDetails.address.country || "",
            }
          : undefined;

        const existingOrder = await Order.findById(session.id);
        if (existingOrder) {
          console.log("⚠️ Order already exists, skipping:", session.id);
          res
            .status(200)
            .json({ received: true, message: "Order already processed" });
          return;
        }

        try {
          const newOrder = await Order.create({
            _id: session.id,
            userId,
            items,
            total,
            status: "paid",
            shippingAddress,
            customerEmail: session.customer_details?.email || "",
            customerName: session.customer_details?.name || "",
          });

          console.log("✅ Order saved to database:", newOrder._id);

          const customerEmail = session.customer_details?.email;
          if (customerEmail) {
            console.log(
              "📧 Attempting to send customer receipt to:",
              customerEmail
            );

            try {
              await sendReceiptEmail(
                customerEmail,
                "Your Eternal Botanic Order Receipt",
                `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #d946ef;">Thank you for your order!</h2>
                    <p>Order ID: <strong>${session.id}</strong></p>
                    <p>Total: <strong>$${total.toFixed(2)}</strong></p>
                    
                    <h3>Order Items:</h3>
                    <ul>
                      ${items
                        .map(
                          (item) =>
                            `<li>${item.name} × ${item.quantity} — $${(
                              item.price * item.quantity
                            ).toFixed(2)}</li>`
                        )
                        .join("")}
                    </ul>
                    
                    ${
                      shippingAddress
                        ? `
                      <h3>Shipping To:</h3>
                      <p>
                        ${shippingAddress.line1}<br/>
                        ${
                          shippingAddress.line2
                            ? shippingAddress.line2 + "<br/>"
                            : ""
                        }
                        ${shippingAddress.city}, ${shippingAddress.state} ${
                            shippingAddress.postal_code
                          }<br/>
                        ${shippingAddress.country}
                      </p>
                    `
                        : ""
                    }
                    
                    <p style="margin-top: 30px;">We'll send another email when your items ship.</p>
                    
                    <hr style="border: 1px solid #e5e7eb; margin-top: 30px;"/>
                    <p style="color: #6b7280; font-size: 12px;">
                      Questions? Reply to this email or contact us at eternalbotanic@gmail.com
                    </p>
                  </div>
                `
              );
              console.log("✅ Customer receipt sent");
            } catch (emailErr: any) {
              console.error(
                "❌ Failed to send customer receipt:",
                emailErr.message
              );
            }
          } else {
            console.warn("⚠️ No customer email available");
          }

          console.log("📧 Sending admin notification...");
          await sendAdminNotification({
            customerEmail:
              session.customer_details?.email || "No email provided",
            customerName: session.customer_details?.name || "No name provided",
            shippingAddress: shippingDetails?.address || null,
            items,
            total,
            orderId: session.id,
          });

          console.log("✅ All webhook processing completed successfully");
        } catch (err: any) {
          console.error("❌ Failed to save order or send emails:", err.message);
          console.error("Full error:", err);
        }
      } catch (err: any) {
        console.error("❌ Failed to process order:", err.message);
        console.error("Full error:", err);
      }
    } else {
      console.log("ℹ️ Unhandled webhook event type:", event.type);
    }

    res.status(200).json({ received: true });
  }
);

export default router;
