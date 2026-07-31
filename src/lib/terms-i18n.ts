export type Lang = "it" | "en" | "de" | "es";

export type TermsContent = {
  langLabel: string;
  pageTitle: string;
  stepLabel: string;
  intro: string;
  checkboxLabel: string;
  acceptButton: string;
  acceptingButton: string;
  errorGeneric: string;
  content: {
    heading: string;
    subheading: string;
    sections: Array<{ title: string; body: string }>;
    footer: string;
  };
};

export const TERMS: Record<Lang, TermsContent> = {
  it: {
    langLabel: "Italiano",
    pageTitle: "Condizioni d'Uso",
    stepLabel: "Passaggio 3 di 4",
    intro:
      "Prima di inserire i tuoi dati per l'attestato, leggi e accetta le condizioni d'uso del corso.",
    checkboxLabel: "Ho letto e accetto le condizioni d'uso",
    acceptButton: "Accetta e continua",
    acceptingButton: "Salvataggio…",
    errorGeneric:
      "Impossibile registrare il consenso. Riprova tra qualche istante.",
    content: {
      heading: "CONDIZIONI D'USO DEL CORSO",
      subheading: "{{APP_NAME}} — Versione 1.0",
      sections: [
        {
          title: "1. OGGETTO",
          body: "Le presenti condizioni regolano l'accesso e l'utilizzo del corso di formazione in e-learning e del relativo software di erogazione {{APP_NAME}} (\"Corso\"/\"Software\"), forniti da Dott. Ing. Nichetti Gian Battista, P.IVA IT01235350194, con sede in Soresina (CR), Italia, tramite il brand CorporateBoostService (\"Fornitore\").",
        },
        {
          title: "2. LICENZA D'USO E PERSONALITÀ DEL CODICE PUK",
          body: "Il Fornitore concede all'Utente una licenza d'uso non esclusiva, non trasferibile e limitata nel tempo, secondo i termini di validità associati alla licenza acquistata. Il codice PUK assegnato è personale e non cedibile: identifica in modo univoco l'Utente che frequenta il Corso e a cui verrà intestato il relativo attestato. La licenza non costituisce cessione di proprietà intellettuale sui contenuti del Corso o sul Software, che restano di esclusiva proprietà del Fornitore.",
        },
        {
          title: "3. MODALITÀ DI ACQUISTO E FATTURAZIONE",
          body: "I pagamenti sono gestiti da Paddle.com Market Limited in qualità di Merchant of Record. Per dettagli consultare la pagina /pagamenti-merchant-of-record.",
        },
        {
          title: "4. USO CONSENTITO E OBBLIGHI DELL'UTENTE",
          body: "L'Utente si impegna a: frequentare personalmente il Corso con il PUK a lui assegnato, senza condividerlo con terzi; non tentare di decompilare, modificare o distribuire il Software o i contenuti didattici; fornire dati anagrafici veritieri ai fini della generazione dell'attestato di partecipazione. L'Utente è l'unico responsabile della correttezza dei dati personali inseriti (nome, cognome, luogo e data di nascita e, in particolare, codice fiscale), esonerando il Fornitore da qualsiasi responsabilità per errori, imprecisioni o falsità di tali dati e per le conseguenze che ne derivino sulla validità o utilizzabilità dell'attestato.",
        },
        {
          title: "5. ATTESTATO DI PARTECIPAZIONE",
          body: "L'attestato viene generato automaticamente al superamento del test finale, sulla base dei dati anagrafici inseriti dall'Utente stesso e delle risposte fornite. Il Fornitore non effettua verifica dell'identità dell'Utente né supervisione in tempo reale della fruizione dei contenuti; l'attestato ha valore di autocertificazione della formazione svolta.",
        },
        {
          title: "6. DATI E PRIVACY",
          body: "Il trattamento dei dati personali è disciplinato dalla Privacy Policy disponibile sul sito, in conformità al Regolamento (UE) 2016/679 (GDPR).",
        },
        {
          title: "7. LIMITAZIONE DI RESPONSABILITÀ",
          body: "Il Corso e il Software sono forniti \"così come sono\". Il Fornitore non garantisce l'assenza di errori o interruzioni del servizio e non risponde di danni indiretti, salvo dolo o colpa grave. I contenuti del Corso hanno finalità informativa/formativa generale e non costituiscono consulenza legale personalizzata.",
        },
        {
          title: "8. DURATA E RISOLUZIONE",
          body: "La licenza ha validità secondo quanto indicato al momento dell'acquisto. Il Fornitore si riserva il diritto di sospendere l'accesso in caso di violazione delle presenti condizioni.",
        },
        {
          title: "9. MODIFICHE ALLE CONDIZIONI",
          body: "In caso di modifiche sostanziali, sarà richiesta nuova accettazione.",
        },
        {
          title: "10. LEGGE APPLICABILE E FORO COMPETENTE",
          body: "Legge italiana. Foro di Cremona, salvo diversa disposizione inderogabile a tutela del consumatore.",
        },
      ],
      footer: "Versione: v1 — Ultimo aggiornamento: 30 luglio 2026",
    },
  },
  en: {
    langLabel: "English",
    pageTitle: "Terms of Use",
    stepLabel: "Step 3 of 4",
    intro:
      "Before entering your details for the certificate, please read and accept the course terms of use.",
    checkboxLabel: "I have read and accept the terms of use",
    acceptButton: "Accept and continue",
    acceptingButton: "Saving…",
    errorGeneric: "Unable to record your consent. Please try again shortly.",
    content: {
      heading: "COURSE TERMS OF USE",
      subheading: "{{APP_NAME}} — Version 1.0",
      sections: [
        {
          title: "1. SUBJECT",
          body: "These terms govern access to and use of the e-learning training course and the related delivery software {{APP_NAME}} (\"Course\"/\"Software\"), provided by Dott. Ing. Nichetti Gian Battista, VAT No. IT01235350194, with registered office in Soresina (CR), Italy, under the CorporateBoostService brand (\"Supplier\").",
        },
        {
          title: "2. LICENCE OF USE AND PERSONAL NATURE OF THE PUK CODE",
          body: "The Supplier grants the User a non-exclusive, non-transferable licence to use the Software, limited in time according to the validity terms associated with the purchased licence. The PUK code assigned is personal and non-transferable: it uniquely identifies the User attending the Course and to whom the corresponding certificate will be issued. The licence does not constitute a transfer of intellectual property rights over the Course content or the Software, which remain the exclusive property of the Supplier.",
        },
        {
          title: "3. PURCHASE AND BILLING",
          body: "Payments are handled by Paddle.com Market Limited acting as Merchant of Record. For details see the page /pagamenti-merchant-of-record.",
        },
        {
          title: "4. PERMITTED USE AND USER OBLIGATIONS",
          body: "The User undertakes to: personally attend the Course using the PUK code assigned to them, without sharing it with third parties; not attempt to decompile, modify or distribute the Software or the course materials; provide truthful personal data for the purpose of generating the certificate of attendance. The User is solely responsible for the accuracy of the personal data entered (first name, last name, place and date of birth and, in particular, tax code), releasing the Supplier from any liability for errors, inaccuracies or false information and for the consequences thereof on the validity or usability of the certificate.",
        },
        {
          title: "5. CERTIFICATE OF ATTENDANCE",
          body: "The certificate is automatically generated upon passing the final test, based on the personal data entered by the User and the answers provided. The Supplier does not verify the User's identity nor supervise in real time the use of the content; the certificate has the value of a self-certification of the training carried out.",
        },
        {
          title: "6. DATA AND PRIVACY",
          body: "The processing of personal data is governed by the Privacy Policy available on the website, in compliance with Regulation (EU) 2016/679 (GDPR).",
        },
        {
          title: "7. LIMITATION OF LIABILITY",
          body: "The Course and the Software are provided \"as is\". The Supplier does not warrant that they will be free from errors or service interruptions and shall not be liable for indirect damages, save for wilful misconduct or gross negligence. The Course content is for general informational/training purposes and does not constitute personalised legal advice.",
        },
        {
          title: "8. DURATION AND TERMINATION",
          body: "The licence is valid for the period indicated at the time of purchase. The Supplier reserves the right to suspend access in the event of a breach of these terms.",
        },
        {
          title: "9. CHANGES TO THE TERMS",
          body: "In the event of material changes, renewed acceptance will be required.",
        },
        {
          title: "10. APPLICABLE LAW AND JURISDICTION",
          body: "Italian law shall apply. The Court of Cremona shall have jurisdiction, without prejudice to any mandatory consumer-protection provisions.",
        },
      ],
      footer: "Version: v1 — Last updated: 30 July 2026",
    },
  },
  de: {
    langLabel: "Deutsch",
    pageTitle: "Nutzungsbedingungen",
    stepLabel: "Schritt 3 von 4",
    intro:
      "Bevor Sie Ihre Daten für die Bescheinigung eingeben, lesen und akzeptieren Sie bitte die Nutzungsbedingungen des Kurses.",
    checkboxLabel: "Ich habe die Nutzungsbedingungen gelesen und akzeptiere sie",
    acceptButton: "Akzeptieren und fortfahren",
    acceptingButton: "Speichern…",
    errorGeneric:
      "Die Einwilligung konnte nicht gespeichert werden. Bitte versuchen Sie es in Kürze erneut.",
    content: {
      heading: "NUTZUNGSBEDINGUNGEN DES KURSES",
      subheading: "{{APP_NAME}} — Version 1.0",
      sections: [
        {
          title: "1. GEGENSTAND",
          body: "Diese Bedingungen regeln den Zugang zu und die Nutzung des E-Learning-Schulungskurses sowie der zugehörigen Bereitstellungssoftware {{APP_NAME}} (\"Kurs\"/\"Software\"), die von Dott. Ing. Nichetti Gian Battista, USt-IdNr. IT01235350194, mit Sitz in Soresina (CR), Italien, unter der Marke CorporateBoostService (\"Anbieter\") bereitgestellt werden.",
        },
        {
          title: "2. NUTZUNGSLIZENZ UND PERSÖNLICHKEIT DES PUK-CODES",
          body: "Der Anbieter gewährt dem Nutzer eine nicht ausschließliche, nicht übertragbare und zeitlich begrenzte Nutzungslizenz gemäß den mit der erworbenen Lizenz verbundenen Gültigkeitsbedingungen. Der zugewiesene PUK-Code ist persönlich und nicht übertragbar: Er identifiziert eindeutig den Nutzer, der den Kurs besucht und auf den die entsprechende Bescheinigung ausgestellt wird. Die Lizenz stellt keine Übertragung der geistigen Eigentumsrechte an den Kursinhalten oder der Software dar, die im ausschließlichen Eigentum des Anbieters verbleiben.",
        },
        {
          title: "3. KAUF- UND ABRECHNUNGSMODALITÄTEN",
          body: "Die Zahlungen werden von Paddle.com Market Limited als Merchant of Record abgewickelt. Einzelheiten finden Sie auf der Seite /pagamenti-merchant-of-record.",
        },
        {
          title: "4. ZULÄSSIGE NUTZUNG UND PFLICHTEN DES NUTZERS",
          body: "Der Nutzer verpflichtet sich: den Kurs persönlich mit dem ihm zugewiesenen PUK-Code zu besuchen, ohne ihn an Dritte weiterzugeben; nicht zu versuchen, die Software oder die Kursinhalte zu dekompilieren, zu verändern oder zu verbreiten; wahrheitsgemäße persönliche Daten zum Zweck der Erstellung der Teilnahmebescheinigung anzugeben. Der Nutzer ist allein verantwortlich für die Richtigkeit der eingegebenen persönlichen Daten (Vorname, Nachname, Geburtsort und -datum sowie insbesondere Steuernummer) und stellt den Anbieter von jeglicher Haftung für Fehler, Ungenauigkeiten oder falsche Angaben sowie für die daraus resultierenden Folgen für die Gültigkeit oder Verwendbarkeit der Bescheinigung frei.",
        },
        {
          title: "5. TEILNAHMEBESCHEINIGUNG",
          body: "Die Bescheinigung wird automatisch nach Bestehen der Abschlussprüfung erstellt, basierend auf den vom Nutzer eingegebenen persönlichen Daten und den gegebenen Antworten. Der Anbieter überprüft weder die Identität des Nutzers noch überwacht er in Echtzeit die Nutzung der Inhalte; die Bescheinigung hat den Wert einer Selbstzertifizierung der durchgeführten Schulung.",
        },
        {
          title: "6. DATEN UND DATENSCHUTZ",
          body: "Die Verarbeitung personenbezogener Daten unterliegt der auf der Website verfügbaren Datenschutzerklärung, in Übereinstimmung mit der Verordnung (EU) 2016/679 (DSGVO).",
        },
        {
          title: "7. HAFTUNGSBESCHRÄNKUNG",
          body: "Der Kurs und die Software werden \"wie besehen\" bereitgestellt. Der Anbieter übernimmt keine Gewähr für Fehlerfreiheit oder ununterbrochene Verfügbarkeit und haftet nicht für indirekte Schäden, außer bei Vorsatz oder grober Fahrlässigkeit. Die Kursinhalte dienen allgemeinen Informations-/Schulungszwecken und stellen keine individuelle Rechtsberatung dar.",
        },
        {
          title: "8. LAUFZEIT UND KÜNDIGUNG",
          body: "Die Lizenz gilt für den zum Zeitpunkt des Kaufs angegebenen Zeitraum. Der Anbieter behält sich das Recht vor, den Zugang bei Verstoß gegen diese Bedingungen zu sperren.",
        },
        {
          title: "9. ÄNDERUNGEN DER BEDINGUNGEN",
          body: "Bei wesentlichen Änderungen ist eine erneute Zustimmung erforderlich.",
        },
        {
          title: "10. ANWENDBARES RECHT UND GERICHTSSTAND",
          body: "Es gilt italienisches Recht. Gerichtsstand ist Cremona, vorbehaltlich zwingender verbraucherschützender Bestimmungen.",
        },
      ],
      footer: "Version: v1 — Letzte Aktualisierung: 30. Juli 2026",
    },
  },
  es: {
    langLabel: "Español",
    pageTitle: "Condiciones de Uso",
    stepLabel: "Paso 3 de 4",
    intro:
      "Antes de introducir tus datos para el certificado, lee y acepta las condiciones de uso del curso.",
    checkboxLabel: "He leído y acepto las condiciones de uso",
    acceptButton: "Aceptar y continuar",
    acceptingButton: "Guardando…",
    errorGeneric:
      "No se ha podido registrar el consentimiento. Inténtalo de nuevo en unos instantes.",
    content: {
      heading: "CONDICIONES DE USO DEL CURSO",
      subheading: "{{APP_NAME}} — Versión 1.0",
      sections: [
        {
          title: "1. OBJETO",
          body: "Las presentes condiciones regulan el acceso y el uso del curso de formación en e-learning y del software de impartición {{APP_NAME}} (\"Curso\"/\"Software\"), suministrados por Dott. Ing. Nichetti Gian Battista, NIF IT01235350194, con sede en Soresina (CR), Italia, a través de la marca CorporateBoostService (\"Proveedor\").",
        },
        {
          title: "2. LICENCIA DE USO Y CARÁCTER PERSONAL DEL CÓDIGO PUK",
          body: "El Proveedor concede al Usuario una licencia de uso no exclusiva, no transferible y limitada en el tiempo, según los términos de validez asociados a la licencia adquirida. El código PUK asignado es personal e intransferible: identifica de manera única al Usuario que asiste al Curso y a quien se emitirá el certificado correspondiente. La licencia no constituye una cesión de la propiedad intelectual sobre los contenidos del Curso o el Software, que siguen siendo propiedad exclusiva del Proveedor.",
        },
        {
          title: "3. FORMA DE COMPRA Y FACTURACIÓN",
          body: "Los pagos son gestionados por Paddle.com Market Limited en calidad de Merchant of Record. Para más detalles consulta la página /pagamenti-merchant-of-record.",
        },
        {
          title: "4. USO PERMITIDO Y OBLIGACIONES DEL USUARIO",
          body: "El Usuario se compromete a: asistir personalmente al Curso utilizando el código PUK que le ha sido asignado, sin compartirlo con terceros; no intentar descompilar, modificar o distribuir el Software o los contenidos didácticos; proporcionar datos personales veraces a efectos de la generación del certificado de asistencia. El Usuario es el único responsable de la exactitud de los datos personales introducidos (nombre, apellidos, lugar y fecha de nacimiento y, en particular, código fiscal), eximiendo al Proveedor de cualquier responsabilidad por errores, inexactitudes o falsedad de dichos datos y por las consecuencias que de ello se deriven sobre la validez o utilización del certificado.",
        },
        {
          title: "5. CERTIFICADO DE ASISTENCIA",
          body: "El certificado se genera automáticamente al superar la prueba final, sobre la base de los datos personales introducidos por el Usuario y las respuestas proporcionadas. El Proveedor no verifica la identidad del Usuario ni supervisa en tiempo real el uso de los contenidos; el certificado tiene el valor de una autocertificación de la formación realizada.",
        },
        {
          title: "6. DATOS Y PRIVACIDAD",
          body: "El tratamiento de los datos personales se rige por la Política de Privacidad disponible en el sitio web, de conformidad con el Reglamento (UE) 2016/679 (RGPD).",
        },
        {
          title: "7. LIMITACIÓN DE RESPONSABILIDAD",
          body: "El Curso y el Software se suministran \"tal cual\". El Proveedor no garantiza la ausencia de errores o interrupciones del servicio y no responde de los daños indirectos, salvo dolo o culpa grave. Los contenidos del Curso tienen una finalidad informativa/formativa general y no constituyen asesoramiento legal personalizado.",
        },
        {
          title: "8. DURACIÓN Y RESOLUCIÓN",
          body: "La licencia tiene la validez indicada en el momento de la compra. El Proveedor se reserva el derecho a suspender el acceso en caso de incumplimiento de estas condiciones.",
        },
        {
          title: "9. MODIFICACIONES DE LAS CONDICIONES",
          body: "En caso de modificaciones sustanciales, será necesaria una nueva aceptación.",
        },
        {
          title: "10. LEY APLICABLE Y JURISDICCIÓN",
          body: "Se aplica la ley italiana. Fuero de Cremona, salvo disposición imperativa distinta en protección del consumidor.",
        },
      ],
      footer: "Versión: v1 — Última actualización: 30 de julio de 2026",
    },
  },
};
