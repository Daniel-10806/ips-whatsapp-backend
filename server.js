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

// PLANTILLA EMPRESARIAL (SIMULACIÓN REAL)
function buildBusinessMessage({ name, message }) {
    return `
IPS –  INGENIERIA, PROYECTOS Y SEGURIDAD GLOBAL SAC 🛡️

Hola ${name} 👋
${message}

📌 Plataforma iCUR@
Gestión de accesos, incidencias y seguridad patrimonial.

Quedamos atentos a tu respuesta.
Equipo IPS
`;
}

app.post("/send-whatsapp", async (req, res) => {
    const { message, phones } = req.body;

    if (!message || !phones || phones.length === 0) {
        return res.status(400).json({ error: "Datos incompletos" });
    }

    const results = [];

    for (const contact of phones) {
        try {
            const finalMessage = buildBusinessMessage({
                name: contact.name,
                message
            });

            await client.messages.create({
                from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
                to: `whatsapp:${contact.phone}`,
                body: finalMessage
            });

            results.push({ name: contact.name, status: "enviado" });
        } catch (err) {
            results.push({ name: contact.name, status: "error" });
        }
    }

    res.json({ success: true, results });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend IPS WhatsApp corriendo en puerto ${PORT}`);
});