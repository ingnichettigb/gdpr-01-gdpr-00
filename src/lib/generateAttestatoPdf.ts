import { PDFDocument, StandardFonts, rgb, degrees, PageSizes } from "pdf-lib";
import { TIMBRO_BASE64 } from "@/assets/timbroBase64";
import { APP_CODE } from "@/lib/app-config";

function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  // Ambiente server (Node): atob potrebbe non esistere
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Uint8Array((globalThis as any).Buffer.from(base64, "base64"));
}
import { buildCertificateQrMatrix } from "@/lib/generateCertificateQr";

export type AttestatoData = {
  nome: string;
  luogo: string;
  dataNascita: string;
  cf: string;
  ditta: string;
  certNumber: string;
  issuedAt?: string;
};

const EMERALD: [number, number, number] = [0.027, 0.42, 0.302]; // ~ emerald-700
const SLATE: [number, number, number] = [0.2, 0.25, 0.33];
const SLATE_LIGHT: [number, number, number] = [0.4, 0.45, 0.5];
const AMBER_BG: [number, number, number] = [0.996, 0.953, 0.78];
const AMBER_FG: [number, number, number] = [0.706, 0.443, 0.043];
const PAGE_BG: [number, number, number] = [0.914, 0.965, 0.914]; // verdino chiaro

function wrapText(
  text: string,
  maxWidth: number,
  font: import("pdf-lib").PDFFont,
  size: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const tentative = current ? current + " " + w : w;
    if (font.widthOfTextAtSize(tentative, size) > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = tentative;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function formatDateIT(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export const TOPICS: { title: string; items: string[] }[] = [
  {
    title: "Lezione 1 — Introduzione al GDPR",
    items: [
      "Comprendere il quadro normativo europeo (Regolamento UE 2016/679)",
      "Distinguere ambito di applicazione e trattamenti esclusi",
      "Riconoscere cosa sono i dati personali e le loro categorie",
      "Conoscere le principali novità del GDPR",
      "Capire le tecniche di trattamento: profilazione, pseudonimizzazione, anonimizzazione, tracciamento",
      "Acquisire consapevolezza sui rischi e sulla protezione dei dati",
      "Saper applicare i concetti di trasparenza, liceità e identificabilità",
    ],
  },
  {
    title: "Lezione 2 — I 7 Principi del GDPR (Parte Prima)",
    items: [
      "Comprendere i primi tre principi fondamentali del GDPR",
      "Liceità, correttezza, trasparenza – Base legale e fiducia",
      "Limitazione della finalità – Vincolo agli scopi dichiarati",
      "Minimizzazione dei dati – Solo i dati necessari",
    ],
  },
  {
    title: "Lezione 3 — I 7 Principi del GDPR (Parte Seconda)",
    items: [
      "Comprendere il principio di Esattezza (dati corretti, aggiornati, privi di errori)",
      "Applicare la Limitazione della Conservazione (tenere i dati solo per il tempo necessario)",
      "Garantire Integrità e Riservatezza (protezione da accessi non autorizzati, perdite e modifiche)",
      "Comprendere il principio di Responsabilizzazione (dimostrare la conformità con evidenze documentate)",
    ],
  },
  {
    title: "Lezione 4 — L'Interessato",
    items: [
      "Comprendere chi è l'Interessato e il suo ruolo centrale nel GDPR",
      "Conoscere i diritti fondamentali (accesso, rettifica, cancellazione, limitazione, portabilità, opposizione)",
      "Imparare come esercitare i diritti (richiesta formale, tempi di risposta, gratuità, trasparenza)",
      "Capire il funzionamento del consenso (requisiti, revoca, minori)",
    ],
  },
  {
    title: "Lezione 5 — Le Figure Chiave del GDPR",
    items: [
      "Comprendere l'organigramma privacy e i ruoli principali (Titolare, Responsabile, Incaricato, DPO)",
      "Distinguere tra Titolare, Contitolare e Titolare Esterno",
      "Conoscere le responsabilità del Responsabile del trattamento (interno ed esterno)",
      "Identificare i soggetti più comuni nelle PMI (commercialista, ufficio paghe, selezione personale)",
      "Definire ruolo e compiti dell'Addetto/Incaricato al trattamento",
      "Capire quando è obbligatoria la nomina del DPO",
      "Riconoscere il ruolo tecnico dell'Amministratore di Sistema",
    ],
  },
  {
    title: "Lezione 6 — Un nuovo approccio alla privacy",
    items: [
      "Comprendere l'approccio proattivo, documentato e basato sul rischio",
      "Privacy by design",
      "Privacy by default",
      "Registro delle attività di trattamento",
      "Sicurezza del trattamento",
      "Data breach",
      "Valutazione d'impatto privacy (DPIA)",
    ],
  },
  {
    title: "Lezione 7 — Responsabilità e Sanzioni",
    items: [
      "Comprendere le conseguenze delle violazioni privacy",
      "Capire come un sistema organizzato riduce rischi, costi e danni reputazionali",
      "Conoscere i mezzi di ricorso",
      "Conoscere le responsabilità",
      "Conoscere le sanzioni",
    ],
  },
  {
    title: "Lezione 8 — Privacy come processo continuo",
    items: [
      "Costruire un sistema privacy aggiornato, efficace e dimostrabile",
      "Applicare un programma di adeguamento annuale",
      "Rafforzare la sicurezza (accessi, password, backup)",
      "Implementare autenticazione a due fattori e misure avanzate",
    ],
  },
  {
    title: "Lezione 9 — Documenti cartacei",
    items: [
      "Non lasciare mai documenti incustoditi",
      "Limitare l'asportazione dei documenti",
      "Proteggere i documenti da sguardi non autorizzati",
      "Evitare copie non necessarie",
      "Custodire con attenzione i documenti sensibili",
    ],
  },
  {
    title: "Lezione 10 — Governance e Compliance GDPR",
    items: [
      "Comprendere i pilastri organizzativi del GDPR",
      "Formalizzare ruoli e responsabilità con contratti e atti scritti",
      "Gestire rapporti con fornitori esterni e nomine dei responsabili",
      "Applicare misure di sicurezza indispensabili (antivirus, firewall, backup, MFA)",
    ],
  },
];

export async function buildAttestatoPdfBytes(
  data: AttestatoData,
): Promise<{ pdfBytes: Uint8Array; slug: string }> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Attestato ${data.nome}`);
  pdfDoc.setAuthor("Corporate Boost Service");
  pdfDoc.setSubject("Attestato Corso Privacy GDPR");
  pdfDoc.setProducer("Corporate Boost Service");
  pdfDoc.setCreator("Corporate Boost Service");

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontBoldItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  // A4 landscape
  const [W, H] = [PageSizes.A4[1], PageSizes.A4[0]];
  const dittaUpper = data.ditta.toUpperCase();
  const cfUpper = data.cf.toUpperCase();
  const issuedDate = data.issuedAt ? new Date(data.issuedAt) : new Date();
  const oggi = issuedDate.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // =============== PAGE 1 — FRONTE ===============
  const p1 = pdfDoc.addPage([W, H]);

  // Sfondo verdino chiaro (fronte e retro)
  const fillBackground = (page: import("pdf-lib").PDFPage) => {
    page.drawRectangle({
      x: 0,
      y: 0,
      width: W,
      height: H,
      color: rgb(...PAGE_BG),
    });
  };

  // Double border
  const drawBorder = (page: import("pdf-lib").PDFPage) => {
    fillBackground(page);
    // outer
    page.drawRectangle({
      x: 14,
      y: 14,
      width: W - 28,
      height: H - 28,
      borderColor: rgb(...EMERALD),
      borderWidth: 2.5,
    });
    // inner
    page.drawRectangle({
      x: 20,
      y: 20,
      width: W - 40,
      height: H - 40,
      borderColor: rgb(...EMERALD),
      borderWidth: 1,
    });
    // thinnest inner
    page.drawRectangle({
      x: 30,
      y: 30,
      width: W - 60,
      height: H - 60,
      borderColor: rgb(EMERALD[0], EMERALD[1], EMERALD[2]),
      borderWidth: 0.4,
      opacity: 0.4,
    });
  };
  drawBorder(p1);

  const centerText = (
    page: import("pdf-lib").PDFPage,
    text: string,
    y: number,
    size: number,
    f: import("pdf-lib").PDFFont,
    color: [number, number, number] = SLATE,
  ) => {
    const w = f.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (W - w) / 2,
      y,
      size,
      font: f,
      color: rgb(...color),
    });
  };

  let y = H - 145;

  centerText(p1, "CORPORATE BOOST SERVICE", y, 9, fontBold, EMERALD);
  y -= 28;
  centerText(p1, "Attestato di Partecipazione", y, 26, fontBold, EMERALD);
  y -= 18;
  centerText(p1, "e superamento del test finale", y, 11, fontItalic, SLATE_LIGHT);

  y -= 28;
  centerText(p1, "Si certifica che", y, 12, font, SLATE);
  y -= 22;
  centerText(p1, data.nome.toUpperCase(), y, 20, fontBold, SLATE);
  y -= 16;
  centerText(p1, `C.F. ${cfUpper}`, y, 11, fontBold, SLATE);

  if (data.luogo || data.dataNascita) {
    y -= 14;
    const parts: string[] = [];
    if (data.luogo) parts.push(`Nato/a a ${data.luogo}`);
    if (data.dataNascita) parts.push(`il ${formatDateIT(data.dataNascita)}`);
    centerText(p1, parts.join(" — "), y, 9, font, SLATE_LIGHT);
  }

  y -= 22;
  centerText(
    p1,
    "Corso e-learning completato e test finale superato con successo",
    y,
    11,
    font,
    SLATE,
  );
  y -= 18;
  centerText(
    p1,
    '"Il Regolamento europeo in materia di protezione dei dati personali"',
    y,
    13,
    fontBoldItalic,
    EMERALD,
  );
  y -= 14;
  centerText(
    p1,
    "General Data Protection Regulation (GDPR) — Regolamento UE 2016/679",
    y,
    9,
    fontBold,
    SLATE,
  );

  // Amber pill
  y -= 18;
  const pillText = "My Privacy corso completo — 4 h";
  const pillW = fontBold.widthOfTextAtSize(pillText, 10) + 16;
  p1.drawRectangle({
    x: (W - pillW) / 2,
    y: y - 3,
    width: pillW,
    height: 16,
    color: rgb(...AMBER_BG),
  });
  centerText(p1, pillText, y + 1, 10, fontBold, AMBER_FG);

  // Course code + Certificate number
  y -= 18;
  centerText(p1, `Codice corso: ${APP_CODE}`, y, 9, font, SLATE);
  y -= 13;
  centerText(p1, `Certificato n. ${data.certNumber}`, y, 10, fontBold, SLATE);

  // Long paragraph
  y -= 22;
  const paragraph = `La formazione è stata erogata da ${dittaUpper} e sviluppata in coerenza con il programma generale e con le direttive operative, le procedure, le nomine e le informative emanate dal Titolare e dal Responsabile Privacy; pertanto il presente attestato è valido esclusivamente come supporto al sistema privacy adottato dalla società ${dittaUpper}.`;
  const paraSize = 9;
  const paraMax = W - 160;
  const lines = wrapText(paragraph, paraMax, fontItalic, paraSize);
  for (const line of lines) {
    const w = fontItalic.widthOfTextAtSize(line, paraSize);
    p1.drawText(line, {
      x: (W - w) / 2,
      y,
      size: paraSize,
      font: fontItalic,
      color: rgb(...SLATE),
    });
    y -= 12;
  }

  // Footer: date left, signature right
  const footerY = 60;
  p1.drawText("Data di rilascio", {
    x: 60,
    y: footerY + 14,
    size: 8,
    font,
    color: rgb(...SLATE_LIGHT),
  });
  p1.drawText(oggi, {
    x: 60,
    y: footerY,
    size: 11,
    font: fontBold,
    color: rgb(...SLATE),
  });

  const sig = "Corporate Boost Service";
  const sigW = fontBold.widthOfTextAtSize(sig, 11);
  const sigX = W - 60 - sigW;

  // Stamp above the signature — incorporato, nessuna richiesta di rete
  try {
    const stampBytes = base64ToUint8Array(TIMBRO_BASE64);
    const stampImg = await pdfDoc.embedPng(stampBytes);
    const stampW = 130;
    const stampH = (stampImg.height / stampImg.width) * stampW;
    p1.drawImage(stampImg, {
      x: sigX + sigW / 2 - stampW / 2 + 10,
      y: footerY + 18,
      width: stampW,
      height: stampH,
      rotate: degrees(-6),
      opacity: 0.9,
    });
  } catch (err) {
    console.error("Timbro: embedding fallito", err);
  }

  // QR code di verifica: a metà strada tra il blocco data (sinistra) e il
  // timbro/firma (destra), sulla stessa riga del footer. Elemento
  // accessorio: un suo eventuale fallimento non deve mai bloccare la
  // generazione dell'attestato.
  try {
    const { size, isDark } = await buildCertificateQrMatrix({
      nomeCompleto: data.nome,
      codiceFiscale: cfUpper,
      certificateNumber: data.certNumber,
      issuedAtIso: issuedDate.toISOString(),
    });
    const qrSize = 69;
    const quietZone = 2; // margine minimo per la leggibilità della scansione
    const moduleSize = qrSize / (size + quietZone * 2);

    const dateLabelW = font.widthOfTextAtSize("Data di rilascio", 8);
    const dateValueW = fontBold.widthOfTextAtSize(oggi, 11);
    const dateCenterX = 60 + Math.max(dateLabelW, dateValueW) / 2;
    const stampCenterX = sigX + sigW / 2 + 10;
    const qrCenterX = (dateCenterX + stampCenterX) / 2;

    const qrOriginX = qrCenterX - qrSize / 2;
    const qrOriginY = footerY - 2;

    // Sfondo bianco pieno (quiet zone inclusa) per il massimo contrasto in scansione
    p1.drawRectangle({
      x: qrOriginX,
      y: qrOriginY,
      width: qrSize,
      height: qrSize,
      color: rgb(1, 1, 1),
    });

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (!isDark(row, col)) continue;
        p1.drawRectangle({
          x: qrOriginX + (col + quietZone) * moduleSize,
          // asse Y del PDF verso l'alto: la riga 0 della matrice è in alto
          y: qrOriginY + qrSize - (row + quietZone + 1) * moduleSize,
          width: moduleSize,
          height: moduleSize,
          color: rgb(0.12, 0.16, 0.22),
        });
      }
    }
  } catch (err) {
    console.error("QR attestato: generazione fallita", err);
  }

  p1.drawLine({
    start: { x: sigX - 10, y: footerY + 14 },
    end: { x: sigX + sigW + 10, y: footerY + 14 },
    thickness: 0.5,
    color: rgb(...SLATE_LIGHT),
  });
  p1.drawText(sig, {
    x: sigX,
    y: footerY,
    size: 11,
    font: fontBold,
    color: rgb(...SLATE),
  });
  const ente = "Ente erogatore";
  const enteW = font.widthOfTextAtSize(ente, 8);
  p1.drawText(ente, {
    x: W - 60 - enteW,
    y: footerY - 12,
    size: 8,
    font,
    color: rgb(...SLATE_LIGHT),
  });

  // =============== PAGE 2 — RETRO ===============
  const p2 = pdfDoc.addPage([W, H]);
  drawBorder(p2);

  let y2 = H - 60;
  centerText(p2, "CORPORATE BOOST SERVICE", y2, 9, fontBold, EMERALD);
  y2 -= 22;
  centerText(p2, "Argomenti del Corso — GDPR & Privacy Operativa", y2, 17, fontBold, EMERALD);
  y2 -= 14;
  centerText(
    p2,
    "GDPR — My Privacy corso completo",
    y2,
    9,
    fontItalic,
    SLATE_LIGHT,
  );

  y2 -= 20;
  // Colonne bilanciate in base al contenuto effettivo (2 colonne: il contenuto ci sta)
  const columns = 2;
  const colGap = 24;
  const margin = 55;
  const colW = (W - margin * 2 - colGap * (columns - 1)) / columns;
  const colX = Array.from({ length: columns }, (_, i) => margin + i * (colW + colGap));
  const itemSize = 8.5;
  const titleSize = 10;
  const lineH = 9.6;
  const titleDrop = 12.5;
  const topicGap = 7;

  // Stima l'altezza di ogni lezione per bilanciare le colonne
  const topicHeight = (t: (typeof TOPICS)[number]) => {
    let h = titleDrop;
    for (const it of t.items) {
      h += wrapText(`• ${it}`, colW, font, itemSize).length * lineH;
    }
    return h + topicGap;
  };

  const colTotal = Array(columns).fill(0);
  const assignment = TOPICS.map((t) => {
    const h = topicHeight(t);
    let minIdx = 0;
    for (let i = 1; i < columns; i++) {
      if (colTotal[i] < colTotal[minIdx]) minIdx = i;
    }
    colTotal[minIdx] += h;
    return minIdx;
  });

  const colY = Array(columns).fill(y2);

  TOPICS.forEach((t, idx) => {
    const col = assignment[idx];
    let cy = colY[col];
    p2.drawText(t.title, {
      x: colX[col],
      y: cy,
      size: titleSize,
      font: fontBold,
      color: rgb(...EMERALD),
    });
    cy -= titleDrop;
    for (const it of t.items) {
      const wrapped = wrapText(`• ${it}`, colW, font, itemSize);
      for (const line of wrapped) {
        p2.drawText(line, {
          x: colX[col],
          y: cy,
          size: itemSize,
          font,
          color: rgb(...SLATE),
        });
        cy -= lineH;
      }
    }
    cy -= topicGap;
    colY[col] = cy;
  });

  const footerText = `Documento generato elettronicamente da Corporate Boost Service — codice corso ${APP_CODE} — ${oggi}`;
  centerText(p2, footerText, 50, 8, font, SLATE_LIGHT);

  // =============== ENCRYPT / SAVE ===============
  // Read-only: only printing allowed. pdf-lib doesn't have native encryption,
  // but we can save with metadata. For real read-only protection use a flag-only approach.
  const pdfBytes = await pdfDoc.save();

  const slug = data.nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  return { pdfBytes, slug };
}

/**
 * Wrapper lato client: genera il PDF (stesso builder condiviso col server)
 * e forza il download nel browser. Comportamento identico a prima.
 */
export async function generateAttestatoPdf(data: AttestatoData): Promise<void> {
  const { pdfBytes, slug } = await buildAttestatoPdfBytes(data);

  const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Attestato_${slug}_${data.certNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
