# KYB PDF Statement Parser MVP

## 1. Project Goal

This project is a Minimum Viable Product (MVP) tool designed for an analyst to upload a PDF bank statement. The tool extracts key information, displays it, lists all transactions, and validates if the sum of transactions reconciles with the statement's starting and ending balances.

The primary goal was to rapidly develop a functional full-stack TypeScript application that leverages modern AI (LLM) capabilities for data extraction and demonstrates an understanding of delivering value quickly within a constrained timeframe.

**Developer:** Karl Nuyda
**Date:** May 17, 2025

## 2. Features

* **PDF Upload:** Allows users to upload bank statement files in PDF format.
* **Text Extraction:** Parses text content from uploaded PDF files.
* **LLM-Powered Data Extraction:** Utilizes Google's Gemini API (specifically the `gemini-1.5-flash-latest` model) to extract the following information from the PDF text:
    * Account Holder Name
    * Account Holder Address
    * Statement Date
    * Starting Balance
    * Ending Balance
    * A list of all transactions (Date, Description, Amount)
* **Transaction Summation:** Calculates the sum of all extracted transactions.
* **Balance Reconciliation:** Validates if the (Extracted Starting Balance + Sum of Transactions) equals the Extracted Ending Balance, within a small tolerance.
* **Clear UI Display:** Presents the extracted information, transaction list, and reconciliation result to the user in a clean, readable format.
* **Error Handling:** Provides feedback for common issues like non-PDF uploads, parsing problems, or LLM API errors.

## 3. Tech Stack

* **Framework:** Next.js 14+ (App Router)
* **Language:** TypeScript
* **Frontend:**
    * React (via Next.js)
    * Standard HTML elements with inline CSS-in-JS (using CSS Custom Properties defined in `globals.css` for theming)
    * `next/image` for optimized image handling (icon)
* **Backend (Next.js API Routes):**
    * Node.js runtime
    * `pdf-parse` library for extracting text from PDFs.
    * `@google/generative-ai` SDK for interacting with the Gemini API.
* **Styling:** Basic CSS with CSS Custom Properties for theming (No external CSS frameworks like Tailwind CSS or Material UI were used to keep the MVP focused and lightweight after initial setup exploration).
* **Environment Variables:** `dotenv` (managed by Next.js for `.env.local`)

## 4. Project Structure

kyb-pdf-parser/├── public/│   └── kypooh.svg         # Application icon├── src/│   ├── app/│   │   ├── api/│   │   │   └── parse-statement/│   │   │       └── route.ts # Backend API endpoint for PDF parsing & LLM interaction│   │   ├── globals.css      # Global styles and CSS custom properties for theme│   │   ├── layout.tsx       # Root layout component│   │   └── page.tsx         # Frontend UI component│   └── (other potential components or lib folders)├── .env.local.example       # Example environment file (user should rename to .env.local)├── .eslintrc.json├── .gitignore├── next.config.mjs          # Next.js configuration├── package-lock.json├── package.json├── README.md                # This file└── tsconfig.json
## 5. Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone github.com/honeykeys/kyb-pdf-parser
    cd kyb-pdf-parser
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```
    *(Or `yarn install` if you prefer Yarn)*

3.  **Set up Environment Variables:**
    * Create a file named `.env.local` in the root of the project.
    * Add your Google AI API key to this file:
        ```env
        GOOGLE_API_KEY="YOUR_GOOGLE_AI_API_KEY_HERE"
        ```

## 6. How to Run the Application

1.  **Start the development server:**
    ```bash
    npm run dev
    ```
2.  Open your browser and navigate to `http://localhost:3000`.
3.  Upload a text-based PDF bank statement to see the extraction and reconciliation results.

## 7. Assumptions & Limitations

* **Text-Based PDFs:** The tool is primarily designed to process **text-based PDFs**. It uses `pdf-parse` which extracts selectable text. It will not work effectively with scanned/image-only PDFs as OCR functionality is not implemented in this MVP. The UI provides a message if minimal text is extracted.
* **LLM Accuracy:** The accuracy of data extraction (account holder name, address, balances, transactions) is dependent on the Gemini model's ability to interpret the PDF text and follow the prompt. While the prompt is engineered for accuracy, variations in PDF layouts can lead to occasional errors or omissions.
* **Statement Formatting Variability:** Bank statements have highly variable formats. The current prompt engineering aims to cover common patterns but may not perfectly parse all statement types.
    * **"Balance Forward" Lines:** The prompt attempts to instruct the LLM to correctly identify and not treat "Balance Brought Forward" lines (that don't have explicit debit/credit amounts) as new transactions. However, complex presentations of these lines might still be misinterpreted, potentially affecting reconciliation if the starting balance is misidentified or such a line is included as a transaction.
    * **"OD" (Overdraft) Amounts:** The prompt instructs the LLM to interpret "OD" or "DR" next to an amount as a negative value. This has been tested on some formats.
* **Single PDF Processing:** The tool processes one PDF at a time. No batch processing.
* **No Database/Persistence:** Extracted data is not stored. Each upload is a fresh processing session.
* **No Authentication/Authorization:** The MVP does not include user accounts or security features.
* **Styling:** Styling is intentionally minimal to focus on core functionality.

## 8. Design & Architectural Choices

* **Full-Stack TypeScript with Next.js:** Chosen for its integrated frontend and backend capabilities, allowing for rapid development with a consistent language.
* **LLM for Core Extraction:** Leveraging a frontier LLM (Google Gemini Flash) was a key decision to handle the inherent variability in PDF bank statement formats more flexibly than relying on complex regex or template-based parsing, especially within a short timeframe. This directly addresses the "creativity of tooling choices" aspect.
* **Server-Side Reconciliation:** The critical transaction summation and balance reconciliation logic is performed in TypeScript on the backend (API route) using the LLM-extracted data. This ensures the validation logic is robust and not reliant on client-side calculations.
* **Focus on MVP:** Prioritized core features (upload, parse, extract, reconcile, display) over non-essential ones (e.g., advanced OCR, extensive styling, user accounts) to deliver a working product quickly.

## 9. Potential Future Enhancements

* **OCR for Scanned PDFs:** Integrate an OCR library (e.g., Tesseract.js) as a fallback if `pdf-parse` extracts minimal text.
* **Improved LLM Prompting:** Further iterative refinement of the LLM prompt based on a wider variety of statement formats to improve extraction accuracy and robustness.
* **User Feedback for Corrections:** Allow users to manually correct extracted data.
* **Support for More Statement Types:** Explicitly train/prompt for less common statement layouts or international formats.
* **Enhanced "Analyst Alerts":** Implement logic to flag potentially suspicious transactions (e.g., unusually large amounts, high frequency of round numbers, date sequence anomalies).
* **Data Export:** Allow users to export extracted data (e.g., to CSV or JSON).
* **UI/UX Polish:** More sophisticated loading indicators, improved visual design, and accessibility enhancements.

---

This README aims to provide a clear overview of the project. Thank you for the opportunity to work on this task!
