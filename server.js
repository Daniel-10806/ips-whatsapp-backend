import express from "express";
import cors from "cors";
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = twilio(
    process.env.TWILIO_SID,
    process.env.TWILIO_AUTH_TOKEN
);

app.post("/send-whatsapp", async (req, res) => {
    const { message, phones } = req.body;

    if (!message || !phones || phones.length === 0) {
        return res.status(400).json({
            success: false,
            error: "Mensaje o teléfonos inválidos"
        });
    }

    const results = [];

    for (const c of phones) {
        try {
            const twilioMsg = await client.messages.create({
                from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
                to: `whatsapp:${c.phone}`,
                body: message,
                statusCallback: `${process.env.BASE_URL}/twilio-status`
            });

            results.push({
                name: c.name,
                phone: c.phone,
                status: "enviado",
                sid: twilioMsg.sid,
                date: new Date().toISOString()
            });

        } catch (err) {
            console.error("❌ Error Twilio:", err.message);

            results.push({
                name: c.name,
                phone: c.phone,
                status: "fallido",
                error: err.message,
                date: new Date().toISOString()
            });
        }
    }

    return res.json({
        success: true,
        accepted: results
    });
});

app.post(
    "/twilio-status",
    express.urlencoded({ extended: false }),
    (req, res) => {
        console.log("📡 Webhook Twilio:", req.body);
        res.sendStatus(200);
    }
);

app.listen(process.env.PORT || 3000, () => {
    console.log("✅ Backend IPS WhatsApp activo");
});