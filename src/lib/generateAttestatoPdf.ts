import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";

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

function formatDateIT(iso: string): string {
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

const TOPICS: { title: string; items: string[] }[] = [
  {
    title: "Principi del GDPR",
    items: [
      "Regolamento UE 2016/679",
      "Privacy come processo continuo",
      "Accountability e responsabilizzazione del titolare",
    ],
  },
  {
    title: "Programma di Adeguamento Annuale",
    items: [
      "Revisione documentazione privacy (PIA, registro trattamenti)",
      "Aggiornamento nomine interne ed esterne",
      "Verifica informative e clausole contrattuali",
      "Valutazione privacy by design & by default",
      "DPIA e gestione data breach",
    ],
  },
  {
    title: "Misure di Sicurezza Tecniche e Organizzative",
    items: [
      "Controllo accessi fisici e digitali",
      "Password sicure: requisiti, custodia e gestione",
      "Autenticazione a due fattori (2FA)",
      "Gestione salvaschermo e protezione postazione",
    ],
  },
  {
    title: "Backup e Protezione dei Dati",
    items: [
      "Tipologie di backup: completo, incrementale, differenziale",
      "Backup locale e cloud",
      "Verifica dell'esito del backup",
      "Procedure di ripristino e continuità operativa",
      "Buone pratiche quotidiane",
    ],
  },
  {
    title: "Gestione Sicura dei Documenti Cartacei",
    items: [
      "Custodia e trasporto dei documenti",
      "Divieti: copie non autorizzate, riciclo, distruzione impropria",
      "Protezione da accessi non autorizzati",
      "Comportamenti corretti in ufficio e fuori sede",
    ],
  },
  {
    title: "Comunicazioni e Telefonate Sicure",
    items: [
      "Verifica dell'identità dell'interlocutore",
      "Evitare conversazioni in luoghi pubblici",
      "Non parlare ad alta voce in presenza di terzi",
    ],
  },
  {
    title: "Uso e Custodia dei Supporti Rimovibili",
    items: [
      "Protezione da furto, calore, campi magnetici",
      "Prevenzione accessi non autorizzati",
      "Conservazione e trasporto sicuro",
    ],
  },
];

export async function generateAttestatoPdf(data: AttestatoData): Promise<void> {
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

  // Double border
  const drawBorder = (page: import("pdf-lib").PDFPage) => {
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

  let y = H - 70;

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
    "ha partecipato e superato con esito positivo il corso in e-learning",
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
  const pillText = "Guida Pratica per l'Addetto e l'Incaricato";
  const pillW = fontBold.widthOfTextAtSize(pillText, 10) + 16;
  p1.drawRectangle({
    x: (W - pillW) / 2,
    y: y - 3,
    width: pillW,
    height: 16,
    color: rgb(...AMBER_BG),
  });
  centerText(p1, pillText, y + 1, 10, fontBold, AMBER_FG);

  // Certificate number
  y -= 18;
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
    "GDPR — Guida Pratica per l'Addetto e l'Incaricato",
    y2,
    9,
    fontItalic,
    SLATE_LIGHT,
  );

  y2 -= 22;
  // Two columns
  const colGap = 30;
  const colW = (W - 120 - colGap) / 2;
  const colX = [60, 60 + colW + colGap];
  const colY = [y2, y2];
  const itemSize = 8.5;
  const titleSize = 10;

  TOPICS.forEach((t, idx) => {
    const col = idx % 2;
    let cy = colY[col];
    p2.drawText(t.title, {
      x: colX[col],
      y: cy,
      size: titleSize,
      font: fontBold,
      color: rgb(...EMERALD),
    });
    cy -= 14;
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
        cy -= 11;
      }
    }
    cy -= 8;
    colY[col] = cy;
  });

  const footerText = `Documento generato elettronicamente da Corporate Boost Service — ${oggi}`;
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
