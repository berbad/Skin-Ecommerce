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
    : "<p><em>No shipping address provided</em></p>";

  const adminHtml = `
    <h2>🎉 New Order Received!</h2>
    <p><strong>Order ID:</strong> ${orderDetails.orderId}</p>
    <hr/>
    
    <h3>Customer Information</h3>
    <p><strong>Name:</strong> ${orderDetails.customerName || "N/A"}</p>
    <p><strong>Email:</strong> ${orderDetails.customerEmail}</p>
    
    ${addressHtml}
    
    <h3>Order Details</h3>
    <ul>${itemsList}</ul>
    
    <p><strong>Total: $${orderDetails.total.toFixed(2)}</strong></p>
    
    <hr/>
    <p><small>This notification was sent from your Eternal Botanic store.</small></p>
  `;

  try {
    await sendReceiptEmail(
      adminEmail,
      `🛍️ New Order #${orderDetails.orderId.slice(-8)}`,
      adminHtml
    );
    console.log("✅ Admin notification sent to:", adminEmail);
  } catch (err) {
    console.error("❌ Failed to send admin notification:", err);
  }
};

router.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response): Promise<void> => {
    const sig = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET as string
      );
      console.log("✅ Webhook verified:", event.type);
    } catch (err: any) {
      console.error("❌ Webhook signature verification failed:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("🎉 Checkout completed for session:", session.id);

      try {
        const lineItems = await stripe.checkout.sessions.listLineItems(
          session.id,
          { limit: 100 }
        );

        const userId = session.metadata?.userId || "guest";

        const items = lineItems.data.map((item) => {
          const quantity = item.quantity || 1;
          const lineTotal = item.amount_total ? item.amount_total / 100 : 0;
          const unitPrice = quantity ? lineTotal / quantity : lineTotal;

          return {
            productId: (item.price?.product as string) || "unknown",
            name: item.description || "Unknown Product",
            quantity,
            price: unitPrice,
          };
        });

        const total =
          session.amount_total && session.currency === "usd"
            ? session.amount_total / 100
            : 0;

        const newOrder = await Order.create({
          _id: session.id,
          userId,
          items,
          total,
          status: "paid",
        });
        console.log("✅ Order saved:", newOrder._id);

        // Send customer receipt
        const customerEmail =
          session.customer_details?.email || "noemail@example.com";
        console.log("📧 Attempting to send receipt to:", customerEmail);

        if (customerEmail !== "noemail@example.com") {
          try {
            await sendReceiptEmail(
              customerEmail,
              "Your Eternal Botanic Order Receipt",
              `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #d946ef;">Thank you for your order!</h2>
                  <p>Your order has been confirmed and will be shipped soon.</p>
                  
                  <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Order ID:</strong> ${session.id}</p>
                    <p><strong>Total:</strong> $${total.toFixed(2)}</p>
                  </div>
                  
                  <h3>Order Details:</h3>
                  <ul style="list-style: none; padding: 0;">
                    ${items
                      .map(
                        (item) =>
                          `<li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                            ${item.name} × ${item.quantity} — $${(
                            item.price * item.quantity
                          ).toFixed(2)}
                          </li>`
                      )
                      .join("")}
                  </ul>
                  
                  <p style="margin-top: 30px;">We'll send you another email when your order ships.</p>
                  
                  <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                  
                  <p style="color: #6b7280; font-size: 14px;">
                    If you have any questions, please contact us at 
                    <a href="mailto:eternalbotanic@gmail.com" style="color: #d946ef;">eternalbotanic@gmail.com</a>
                  </p>
                </div>
              `
            );
            console.log(
              "✅ Customer receipt sent successfully to:",
              customerEmail
            );
          } catch (emailError: any) {
            console.error("❌ Customer email failed:", emailError.message);
          }
        } else {
          console.log("⚠️ No valid customer email, skipping receipt");
        }

        // Admin notification
        try {
          await sendAdminNotification({
            customerEmail:
              session.customer_details?.email || "No email provided",
            customerName: session.customer_details?.name || "No name provided",
            shippingAddress: (session as any).shipping_details?.address || null,
            items,
            total,
            orderId: session.id,
          });
        } catch (emailError: any) {
          console.error("❌ Admin email failed:", emailError.message);
        }
      } catch (err: any) {
        console.error("❌ Failed to process order:", err.message);
      }
    }

    res.status(200).json({ received: true });
  }
);

export default router;
