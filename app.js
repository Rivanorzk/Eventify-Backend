import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoute.js";
import categoryRoutes from "./routes/categoryRoute.js";
import userRoutes from "./routes/userRoute.js";
import eventRoutes from "./routes/eventRoute.js";
import ticketCategoryRoutes from "./routes/ticketCategoryRoute.js";
import eventTicketCategoryRoutes from "./routes/eventTicketCategoryRoute.js";
import voucherRoutes from "./routes/voucherRoute.js";
import orderRoutes from "./routes/orderRoute.js";
import paymentRoutes from "./routes/paymentRoute.js";
import ticketRoutes from "./routes/ticketRoute.js";
import redemptionRoutes from "./routes/redemptionRoute.js";
import notificationRoutes from "./routes/notificationRoute.js";
import eventReminderRoutes from "./routes/eventReminderRoute.js";
import auditlogRoutes from "./routes/auditlogRoute.js";
import dashboardRoutes from "./routes/dashboardRoute.js";
import eventTicketAreaRoutes from "./routes/eventTicketAreaRoute.js";
import eventTicketBenefitRoutes from "./routes/eventTicketBenefitRoute.js";
import eventTicketRuleRoutes from "./routes/eventTicketRuleRoute.js";
import settingsRoutes from "./routes/settingsRoute.js";
import notFoundMiddleware from "./middleware/notFoundMIddleware.js";
import errorMiddleware from "./middleware/errorMiddleware.js";
import { startScheduler } from "./lib/utils/scheduler.js";
import { requestMetrics } from "./lib/utils/requestMetrics.js";
import { auditTrail } from "./middleware/auditTrail.js";

dotenv.config();
const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://concert-system-frontend-gghvac19v-rivanos-projects.vercel.app",
      "https://bullseye-attribute-glacier.ngrok-free.dev",
      "http://localhost:8081"
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(requestMetrics);
app.use(auditTrail);

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/categories", categoryRoutes);
app.use("/events", eventRoutes);
app.use("/ticket-categories", ticketCategoryRoutes);
app.use("/event-ticket-categories", eventTicketCategoryRoutes);
app.use("/vouchers", voucherRoutes);
app.use("/orders", orderRoutes);
app.use("/payments", paymentRoutes);
app.use("/tickets", ticketRoutes);
app.use("/redemptions", redemptionRoutes);
app.use("/notifications", notificationRoutes);
app.use("/reminders", eventReminderRoutes);
app.use("/audit-logs", auditlogRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/event-ticket-areas", eventTicketAreaRoutes);
app.use("/event-ticket-benefits", eventTicketBenefitRoutes);
app.use("/event-ticket-rules", eventTicketRuleRoutes);
app.use("/settings", settingsRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
startScheduler();

app.listen(4000, () => {
  console.log("Server running on port 4000");
});