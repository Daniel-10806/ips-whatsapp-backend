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
        return res.status(400).json({ error: "Datos incompletos" });
    }

    try {
        for (const phone of phones) {
            await client.messages.create({
                from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
                to: `whatsapp:${phone}`,
                body: message
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error enviando WhatsApp" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend IPS WhatsApp corriendo en puerto ${PORT}`);
});