import QRCode from "qrcode";
import { APP_NAME } from "@/lib/app-config";
import { formatDateIT } from "@/lib/generateAttestatoPdf";

/**
 * Generazione del QR code dell'attestato.
 *
 * Modulo puro, senza alcuna dipendenza da pdf-lib: riceve i dati del
 * certificato (già noti dopo l'insert in DB, quando certificate_number e
 * issued_at esistono) e ritorna i bytes PNG del QR, pronti per essere
 * embeddati nel PDF con lo stesso meccanismo già usato per il timbro
 * (pdfDoc.embedPng). Nessuna chiamata di rete: la libreria 'qrcode' genera
 * il PNG interamente lato server/edge, così i dati personali (nome,
 * cognome, codice fiscale) non lasciano mai il perimetro dell'app.
 */

const ENTE = "Corporate Boost Service";
const ORE_CORSO = 4;

export type CertificateQrInput = {
  /** Come raccolto dal form: campo unico "Nome e cognome" */
  nomeCompleto: string;
  codiceFiscale: string;
  certificateNumber: string;
  /** ISO date string (certificates.issued_at) */
  issuedAtIso: string;
};

/**
 * Il form raccoglie nome e cognome in un unico campo ("Nome e cognome"),
 * quindi qui li separiamo euristicamente sull'ultimo spazio: tutto ciò che
 * precede è il nome, l'ultima parola è il cognome. Se in futuro il form
 * dovesse raccogliere i due campi separatamente, questa funzione va
 * aggiornata (o rimossa) di conseguenza.
 */
function splitNomeCognome(nomeCompleto: string): { nome: string; cognome: string } {
  const trimmed = nomeCompleto.trim().replace(/\s+/g, " ");
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace === -1) {
    return { nome: trimmed, cognome: "" };
  }
  return {
    nome: trimmed.slice(0, lastSpace),
    cognome: trimmed.slice(lastSpace + 1),
  };
}

export function buildCertificateQrPayload(input: CertificateQrInput) {
  const { nome, cognome } = splitNomeCognome(input.nomeCompleto);
  return {
    nome,
    cognome,
    codice_fiscale: input.codiceFiscale.toUpperCase(),
    corso: APP_NAME,
    ore: ORE_CORSO,
    certificato: input.certificateNumber,
    rilascio: formatDateIT(input.issuedAtIso),
    ente: ENTE,
  };
}

/**
 * Genera il PNG del QR code (bytes pronti per pdfDoc.embedPng).
 * errorCorrectionLevel "M" per tollerare piccole imperfezioni di stampa
 * mantenendo una densità di dati contenuta (il payload è breve).
 */
export async function generateCertificateQrPng(
  input: CertificateQrInput,
): Promise<Uint8Array> {
  const payload = buildCertificateQrPayload(input);
  const json = JSON.stringify(payload);

  const buffer = await QRCode.toBuffer(json, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 300,
    color: {
      dark: "#1f2937",
      light: "#00000000",
    },
  });

  return new Uint8Array(buffer);
}
