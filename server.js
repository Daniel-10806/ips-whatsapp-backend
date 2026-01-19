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
IPS – INGENIERIA, PROYECTOS Y SEGURIDAD GLOBAL SAC 🛡️

Hola ${name} 👋
${message}

📌 Plataforma iCUR@
Gestión de accesos e incidencias.

Equipo IPS
`;
}

app.post("/send-whatsapp", async (req, res) => {
    const { message, phones } = req.body;
    const results = [];

    for (const c of phones) {
        try {
            await client.messages.create({
                from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
                to: `whatsapp:${c.phone}`,
                body: buildBusinessMessage({ name: c.name, message })
            });

            results.push({
                name: c.name,
                phone: c.phone,
                status: "enviado",
                date: new Date().toISOString()
            });
        } catch {
            results.push({
                name: c.name,
                phone: c.phone,
                status: "error",
                date: new Date().toISOString()
            });
        }
    }

    res.json({ success: true, results });
});

app.listen(process.env.PORT || 3000);