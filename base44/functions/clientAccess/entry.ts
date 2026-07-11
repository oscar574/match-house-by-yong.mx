import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

// === MODO DEMO (por defecto) ===
// Demo mode is on by default: the fixed code below is accepted and shown on
// screen ("Modo demo: usa el código 123456"). No provider needed.
const DEMO_MODE = true;
const DEMO_CODE = '123456';

// === MODO PRODUCCIÓN (WhatsApp API via Twilio) ===
// Para enviar códigos reales por WhatsApp:
// 1) Configura los secrets TWILIO_SID, TWILIO_TOKEN y TWILIO_WHATSAPP_FROM
//    (Dashboard > Settings > Environment Variables).
// 2) Cambia DEMO_MODE a false.
// 3) Implementa sendViaTwilio: lee esos secrets, haz POST a la API de Twilio Messages
//    (Basic auth con SID:TOKEN, From = el número remitente, To = whatsapp:<phone>,
//    Body con el código) y llámala en sendOtp en lugar de devolver demoCode.
//    El código de producción NUNCA se devuelve ni se loguea.

function normalizePhone(input) {
  if (input == null) return '';
  let d = String(input).replace(/\D/g, '');
  if (!d) return '';
  if (d.length === 13 && d.startsWith('521')) d = '52' + d.slice(3);
  if (d.length === 11 && d.startsWith('1')) d = '52' + d.slice(1);
  if (d.length === 12 && d.startsWith('52')) return d;
  if (d.length === 10) return '52' + d;
  return d;
}

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === 'sendOtp') {
      const phone = normalizePhone(body.phone);
      if (!/^\d{12}$/.test(phone) || !phone.startsWith('52')) {
        return Response.json({ ok: false, error: 'Número inválido. Usa un teléfono mexicano de 10 dígitos.' }, { status: 400 });
      }
      const found = await base44.asServiceRole.entities.Client.filter({ whatsapp: phone });
      // Prefer the master record (not marked as duplicate) so OTP links to the data-rich record.
      const master = found.find(c => !c.duplicate_of) || found[0];
      const code = DEMO_MODE ? DEMO_CODE : genCode();
      const expires = new Date(Date.now() + OTP_TTL_MS).toISOString();
      const otpFields = { whatsapp_otp_code: code, whatsapp_otp_expires_at: expires, whatsapp_otp_attempts: 0 };
      if (master) {
        await base44.asServiceRole.entities.Client.update(master.id, otpFields);
      } else {
        await base44.asServiceRole.entities.Client.create({
          whatsapp: phone,
          name: '',
          phone_verified: false,
          lead_source: 'MatchHouse OTP',
          ...otpFields
        });
      }
      // In production: await sendViaTwilio(phone, code);
      // The production code is never returned nor logged. Only the demo code is returned (shown on screen).
      return Response.json({
        ok: true,
        mode: DEMO_MODE ? 'demo' : 'production',
        ...(DEMO_MODE ? { demoCode: DEMO_CODE } : {})
      });
    }

    if (action === 'verifyOtp') {
      const phone = normalizePhone(body.phone);
      const code = String(body.code || '').trim();
      if (!phone || !code) return Response.json({ ok: false, error: 'Datos incompletos.' }, { status: 400 });
      const found = await base44.asServiceRole.entities.Client.filter({ whatsapp: phone });
      const client = found.find(c => !c.duplicate_of) || found[0];
      if (!client) return Response.json({ ok: false, error: 'Solicita un código primero.' }, { status: 400 });
      if ((client.whatsapp_otp_attempts || 0) >= MAX_ATTEMPTS) {
        return Response.json({ ok: false, error: 'Demasiados intentos. Solicita un nuevo código.' }, { status: 400 });
      }
      const exp = client.whatsapp_otp_expires_at ? new Date(client.whatsapp_otp_expires_at) : null;
      if (!exp || exp.getTime() < Date.now()) {
        return Response.json({ ok: false, error: 'El código expiró. Solicita uno nuevo.' }, { status: 400 });
      }
      if (!client.whatsapp_otp_code || client.whatsapp_otp_code !== code) {
        await base44.asServiceRole.entities.Client.update(client.id, { whatsapp_otp_attempts: (client.whatsapp_otp_attempts || 0) + 1 });
        return Response.json({ ok: false, error: 'Código incorrecto.' }, { status: 400 });
      }
      const sessionToken = crypto.randomUUID();
      const has = (v) => v != null && v !== '' && !(Array.isArray(v) && v.length === 0);
      const needsOnboarding = !has(client.name) || !has(client.operation_preference) || !has(client.favorite_zones) || !(client.budget_max_estimated > 0);
      await base44.asServiceRole.entities.Client.update(client.id, {
        phone_verified: true,
        whatsapp_verified_at: new Date().toISOString(),
        whatsapp_otp_code: '',
        whatsapp_otp_attempts: 0,
        session_token: sessionToken,
        last_activity_date: new Date().toISOString()
      });
      return Response.json({ ok: true, client_id: client.id, session_token: sessionToken, needsOnboarding });
    }

    return Response.json({ error: 'Acción no soportada.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});