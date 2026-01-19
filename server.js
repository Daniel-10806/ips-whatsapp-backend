import express from "express";
import cors from "cors";
import twilio from "twilio";
import dotenv from "dotenv";
import { pool } from "./db.js";
import { randomUUID } from "crypto";
import { Server } from "socket.io";
import pkg from "pg";

const { Pool } = pkg;

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const io = new Server(server, {
    cors: { origin: "*" }
});

export function notifyStatusUpdate(data) {
    io.emit("status-update", data);
}

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
    const id = randomUUID();

    await pool.query(`
  INSERT INTO whatsapp_messages
  (id, phone, contact_name, message, status)
  VALUES ($1,$2,$3,$4,'pendiente')
`, [id, c.phone, c.name, message]);

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
            const msg = await client.messages.create({
                from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
                to: `whatsapp:${c.phone}`,
                body: message,
                statusCallback: `${process.env.BASE_URL}/twilio-status`
            });

            await pool.query(`
  UPDATE whatsapp_messages
  SET message_sid = $1, status='enviado'
  WHERE phone=$2 AND status='pendiente'
`, [msg.sid, c.phone]);

        } catch (err) {
            console.error("Error enviando a", c.phone, err.message);
        }
    });
});

app.post("/twilio-status", express.urlencoded({ extended: false }), async (req, res) => {
    const { MessageSid, MessageStatus } = req.body;

    const mapStatus = {
        sent: "enviado",
        delivered: "entregado",
        failed: "fallido"
    };

    if (mapStatus[MessageStatus]) {
        await pool.query(`
          UPDATE whatsapp_messages
          SET status=$1, updated_at=NOW()
          WHERE message_sid=$2
        `, [mapStatus[MessageStatus], MessageSid]);
    }

    res.sendStatus(200);
    notifyStatusUpdate({
        messageSid: MessageSid,
        status: mapStatus[MessageStatus]
    });
});

app.get("/kpi", async (_, res) => {
    const result = await pool.query(`
      SELECT status, COUNT(*) 
      FROM whatsapp_messages
      GROUP BY status
    `);
    res.json(result.rows);
});

fetch("/kpi")
    .then(r => r.json())
    .then(data => {
        document.getElementById("kpi-ok").textContent =
            data.find(d => d.status === "entregado")?.count || 0;
    });


app.listen(process.env.PORT || 3000, () =>
    console.log("Backend IPS WhatsApp activo")
);