import QRCode from "qrcode";
import { APP_NAME } from "@/lib/app-config";
import { formatDateIT } from "@/lib/generateAttestatoPdf";

/**
 * Costruzione dei dati del QR code dell'attestato: payload JSON e matrice
 * di moduli chiari/scuri, pronta per essere disegnata in
 * generateAttestatoPdf.ts. Nessuna dipendenza da pdf-lib in questo file,
 * nessuna chiamata di rete: i dati personali (nome, cognome, codice
 * fiscale) non lasciano mai il perimetro dell'app.
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

/**
 * Rimuove i diacritici (é -> e, à -> a, ò -> o, ecc.), mantenendo solo
 * caratteri ASCII.
 *
 * Necessario SOLO per il payload del QR, non per il testo stampato sul PDF
 * (che resta accentato correttamente). Il QR in "byte mode" non porta con
 * sé nessuna indicazione di charset (nessun marcatore ECI): molti lettori
 * QR generici (fotocamera di smartphone, zbar, ecc.) assumono per default
 * una codifica diversa da UTF-8 per i byte non-ASCII, e i caratteri
 * accentati italiani arrivano corrotti (es. "é" letto come un carattere
 * CJK a caso). L'ASCII puro invece è identico byte-per-byte in qualunque
 * codifica, quindi è l'unica scelta davvero interoperabile per un payload
 * pensato per essere letto da app di terzi.
 */
function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function buildCertificateQrPayload(input: CertificateQrInput) {
  const { nome, cognome } = splitNomeCognome(input.nomeCompleto);
  return {
    nome: stripDiacritics(nome),
    cognome: stripDiacritics(cognome),
    codice_fiscale: input.codiceFiscale.toUpperCase(),
    corso: APP_NAME,
    ore: ORE_CORSO,
    certificato: input.certificateNumber,
    rilascio: formatDateIT(input.issuedAtIso),
    ente: ENTE,
  };
}

/**
 * Genera la matrice del QR (moduli chiari/scuri), da disegnare direttamente
 * con page.drawRectangle in generateAttestatoPdf.ts — nessuna dipendenza da
 * pdf-lib qui, nessuna chiamata di rete: i dati personali non lasciano mai
 * il perimetro dell'app.
 *
 * Deliberatamente NON usiamo QRCode.toBuffer/toDataURL (rendering PNG):
 * quella via passa internamente per 'pngjs', che si appoggia al modulo
 * 'zlib' di Node per la compressione — disponibile lato server ma non
 * affidabile in un bundle browser, dove falliva silenziosamente.
 * QRCode.create(...) calcola solo la matrice (puro calcolo, nessuna I/O,
 * nessuna dipendenza da zlib/canvas): funziona identicamente in qualsiasi
 * runtime JS.
 */
export type CertificateQrMatrix = {
  size: number;
  isDark: (row: number, col: number) => boolean;
};

export async function buildCertificateQrMatrix(
  input: CertificateQrInput,
): Promise<CertificateQrMatrix> {
  const payload = buildCertificateQrPayload(input);
  const json = JSON.stringify(payload);

  const qr = QRCode.create(json, { errorCorrectionLevel: "M" });
  const { size, data } = qr.modules;

  return {
    size,
    isDark: (row: number, col: number) => data[row * size + col] === 1,
  };
}
