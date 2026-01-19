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

function buildBusinessMessage({ name, message }) {
    return `

${message}
`;
}

app.post("/send-whatsapp", async (req, res) => {
    const { message, phones } = req.body;

    if (!message || !phones?.length) {
        return res.status(400).json({ success: false });
    }

    res.json({
        success: true,
        accepted: phones.map(c => ({
            name: c.name,
            phone: c.phone,
            status: "enviado",
            date: new Date().toISOString()
        }))
    });

    phones.forEach(async c => {
        try {
            await client.messages.create({
                from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
                to: `whatsapp:${c.phone}`,
                body: message,
                statusCallback: `${process.env.BASE_URL}/twilio-status`
            });
        } catch (err) {
            console.error("Error enviando a", c.phone, err.message);
        }
    });
});

app.post("/twilio-status", express.urlencoded({ extended: false }), (req, res) => {
    const { MessageSid, MessageStatus, To } = req.body;

    console.log("Webhook Twilio:", MessageSid, MessageStatus, To);

    res.sendStatus(200);
});

app.listen(process.env.PORT || 3000, () =>
    console.log("Backend IPS WhatsApp activo")
);