import express from "express";
import cors from "cors";
import twilio from "twilio";
import dotenv from "dotenv";
import { pool } from "./db.js";
import { randomUUID } from "crypto";
import http from "http";
import { Server } from "socket.io";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const client = twilio(
    process.env.TWILIO_SID,
    process.env.TWILIO_AUTH_TOKEN
);

function notifyStatusUpdate(data) {
    io.emit("status-update", data);
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
            date: new Date().toISOString()
        }))
    });

    for (const c of phones) {
        const id = randomUUID();

        await pool.query(`
            INSERT INTO whatsapp_messages
            (id, phone, contact_name, message, status)
            VALUES ($1,$2,$3,$4,'pendiente')
        `, [id, c.phone, c.name, message]);

        try {
            const msg = await client.messages.create({
                from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
                to: `whatsapp:${c.phone}`,
                body: message,
                statusCallback: `${process.env.BASE_URL}/twilio-status`
            });

            await pool.query(`
                UPDATE whatsapp_messages
                SET message_sid=$1, status='enviado'
                WHERE id=$2
            `, [msg.sid, id]);

        } catch (err) {
            await pool.query(`
                UPDATE whatsapp_messages
                SET status='fallido'
                WHERE id=$1
            `, [id]);
        }
    }
});

app.post("/twilio-status", async (req, res) => {
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

        notifyStatusUpdate({
            messageSid: MessageSid,
            status: mapStatus[MessageStatus]
        });
    }

    res.sendStatus(200);
});

app.get("/kpi", async (_, res) => {
    const { rows } = await pool.query(`
        SELECT status, COUNT(*)::int
        FROM whatsapp_messages
        GROUP BY status
    `);
    res.json(rows);
});

server.listen(process.env.PORT || 3000, () =>
    console.log("✅ Backend IPS WhatsApp activo")
);