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
        return res.status(400).json({ success: false, results: [] });
    }

    const tasks = phones.map(async c => {
        try {
            await client.messages.create({
                from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
                to: `whatsapp:${c.phone}`,
                body: buildBusinessMessage({ name: c.name, message })
            });

            return {
                name: c.name,
                phone: c.phone,
                status: "enviado",
                date: new Date().toISOString()
            };
        } catch {
            return {
                name: c.name,
                phone: c.phone,
                status: "error",
                date: new Date().toISOString()
            };
        }
    });

    const results = await Promise.all(tasks);
    res.json({ success: true, results });
});

app.listen(process.env.PORT || 3000, () =>
    console.log("Backend IPS WhatsApp activo")
);