import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig } from "@google/generative-ai";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  console.error("FATAL ERROR: GOOGLE_API_KEY environment variable is not set. The API will not function.");
}
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY || "YOUR_API_KEY_NOT_SET");

interface Transaction {
  date: string;      
  description: string;
  amount: number;   
}
interface ExtractedData {
  accountHolderName: string | null;
  accountHolderAddress: string | null;
  statementDate: string | null;
  transactions: Transaction[];
  startingBalance: number | null;
  endingBalance: number | null;
  rawPdfText?: string;
}
interface ReconciliationResult {
  calculatedEndingBalance: number | null;
  difference: number | null;            
  matches: boolean;                     
}

async function parsePdfToString(fileBuffer: ArrayBuffer): Promise<string> {
  try {
    const data = await pdf(fileBuffer);
    console.log(`API Info: PDF parsed. Pages: ${data.numpages}. Text length: ${data.text.length}`);
    if (!data.text || data.text.trim() === "") {
      console.warn("API Warning: PDF parsed, but no text content was extracted. It might be an image-based or empty PDF.");
    }
    return data.text;
  } catch (error) {
    console.error("API Error: pdf-parse encountered an error during PDF processing.", error);
    throw new Error("Error processing PDF file content with pdf-parse.");
  }
}

async function getDetailsFromLlm(text: string): Promise<Omit<ExtractedData, 'rawPdfText'>> {
  console.log("API Info: Attempting to extract details from text using Gemini API.");

  if (!GOOGLE_API_KEY || GOOGLE_API_KEY === "YOUR_API_KEY_NOT_SET") {
    console.error("API Error: GOOGLE_API_KEY is not configured. Cannot call Gemini API.");
    return {
      accountHolderName: "Error: Gemini API Key Missing or Invalid",
      accountHolderAddress: null, statementDate: null, transactions: [], startingBalance: null, endingBalance: null,
    };
  }

  if (!text || text.trim() === "") {
    console.warn("API Warning: Gemini LLM called with empty text. Returning empty data structure.");
    return {
      accountHolderName: null, accountHolderAddress: null, statementDate: null,
      transactions: [], startingBalance: null, endingBalance: null,
    };
  }

  const prompt = `
You are an expert financial data extraction assistant. Your task is to parse the provided bank statement text and extract specific information.
Return the information ONLY as a valid JSON object. Do not include any explanatory text, markdown, or anything else before or after the JSON.
The JSON object must strictly follow this schema:
{
  "accountHolderName": "string | null",
  "accountHolderAddress": "string | null",
  "statementDate": "YYYY-MM-DD | null (This is the closing date or 'as of' date of the statement)",
  "startingBalance": "number (float) | null",
  "endingBalance": "number (float) | null",
  "transactions": [
    {
      "date": "YYYY-MM-DD (or original date string if unparseable to YYYY-MM-DD)",
      "description": "string",
      "amount": "number (float, negative for debits/withdrawals, positive for credits/deposits)"
    }
  ]
}

Important rules for extraction:
1.  Dates: For 'statementDate' and transaction 'date', try to normalize to "YYYY-MM-DD" format if possible. If a date is ambiguous or cannot be parsed, return it as a string in its original format. If a year is missing for a transaction (e.g., "Oct 05"), infer it from the statement period or statement date if possible.
2.  Amounts: Ensure 'amount' for transactions is a number. Debits, withdrawals, payments, or charges should be negative. Deposits, credits, or payments received should be positive. Remove currency symbols (e.g., $, £, €).
3.  Interpreting Debits/Overdrafts: If an amount is followed by "OD", "DR", or is in a dedicated debit column, it represents a negative value. Convert these to a negative number for the 'amount' field (e.g., "50.00 OD" becomes -50.00). If an amount is explicitly shown with a minus sign (e.g., "-50.00" or "(50.00)"), treat it as negative.
4.  Balances: 'startingBalance' and 'endingBalance' should be numbers. If not found, return null.
5.  Transactions: Extract all itemized transactions. If a transaction line has separate debit and credit columns, combine them into a single 'amount' field with the correct sign. Be careful to distinguish between actual transactions and summary lines or running balances within the transaction list.
6.  Handling Balance Forward: Lines like 'BALANCE BROUGHT FORWARD', 'BROUGHT FORWARD', 'B/FWD', 'OPENING BALANCE', or similar descriptions that appear in the transaction list area should NOT be treated as new transactions if their specific debit/credit amount columns are empty, zero, or not present. The balance figure on such a line often represents the 'startingBalance' for the period, especially if it's the first entry in the transaction list section or clearly labeled as such. If you use such a line to determine the 'startingBalance', do not also list it as a transaction.
7.  Address: Concatenate multi-line addresses into a single string, preferably with newline characters preserved (e.g., "123 Main St\\nAnytown, ST 12345"). If preserving newlines as \`\\n\` in the JSON string is difficult, using spaces is acceptable.
8.  Missing Information: If a specific piece of information (e.g., startingBalance, if not inferable from a 'Balance Forward' line) is not found in the text, return \`null\` for that field. Do not make up information. For transactions, if a field like 'date' is truly missing for a specific transaction, you can return \`null\` for the date, but try your best to find it or infer it.
9.  Accuracy: Be as accurate as possible. Double-check numbers and dates. Pay attention to details like transaction descriptions.
10. JSON Only: Your entire response must be ONLY the JSON object. No introductory phrases, no concluding remarks, just the JSON. Do not wrap the JSON in markdown backticks.
11. Empty Arrays: If no transactions are found (after correctly excluding non-transactional lines like 'Balance Forward'), return an empty array for the "transactions" field: \`"transactions": []\`.
12. Null for Top-Level Fields: If a top-level field like \`accountHolderName\` is not found, it should be \`null\`, e.g., \`"accountHolderName": null\`.

Here is the bank statement text to parse:
---
${text}
---
Now, provide the JSON output.
`;

  try {
    console.log("API Info: Sending request to Google Gemini API with model 'gemini-1.5-flash-latest'.");
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash-latest",
    });

    const generationConfig: GenerationConfig = {
      temperature: 0.1,
      topK: 1,
      topP: 1,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    };

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{text: prompt}] }],
        generationConfig,
    });

    const response = result.response;
    const jsonResponseString = response.text();

    if (!jsonResponseString) {
      console.error("API Error: Gemini LLM returned an empty response content.");
      throw new Error("Gemini LLM returned an empty response.");
    }

    console.log("API Info: Received response from Gemini LLM. Attempting to parse JSON.");

    const parsedJson = JSON.parse(jsonResponseString);

    const requiredFields = ["accountHolderName", "accountHolderAddress", "statementDate", "startingBalance", "endingBalance", "transactions"];
    for (const field of requiredFields) {
        if (!(field in parsedJson)) {
            console.warn(`API Warning: Gemini JSON response missing expected field: ${field}. Defaulting to null or empty array.`);
            if (field === "transactions") {
                 parsedJson.transactions = [];
            } else {
                 parsedJson[field] = null;
            }
        }
    }
    if (parsedJson.transactions && !Array.isArray(parsedJson.transactions)) {
        console.warn("API Warning: Gemini 'transactions' field is not an array. Defaulting to empty array.");
        parsedJson.transactions = [];
    }

    console.log("API Info: Gemini JSON response parsed successfully.");
    return parsedJson as Omit<ExtractedData, 'rawPdfText'>;

  } catch (error: any) {
    console.error("API Error: Error during Gemini LLM call or JSON parsing.", error);
    if (error.message) console.error("Error message:", error.message);
    if (error.stack) console.error("Error stack:", error.stack);

    return {
      accountHolderName: `Error: Gemini LLM Failed (Details: ${error.message || 'Unknown error'})`,
      accountHolderAddress: null, statementDate: null, transactions: [], startingBalance: null, endingBalance: null,
    };
  }
}

function performReconciliation(data: Omit<ExtractedData, 'rawPdfText'>): ReconciliationResult {
  console.log("API Info: Performing reconciliation.");

  if (data.startingBalance === null || data.endingBalance === null || !data.transactions) {
    console.warn("API Warning: Cannot perform reconciliation due to missing balance or transaction data.");
    return {
        calculatedEndingBalance: null,
        difference: null,
        matches: false,
    };
  }

  const validTransactions = data.transactions.filter(tx => typeof tx.amount === 'number' && !isNaN(tx.amount));
  if (validTransactions.length !== data.transactions.length) {
      console.warn(`API Warning: ${data.transactions.length - validTransactions.length} transactions had invalid amounts and were excluded from reconciliation.`);
  }

  const sumOfTransactions = validTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const calculatedEndingBalance = parseFloat((data.startingBalance + sumOfTransactions).toFixed(2));
  const statedEndingBalance = parseFloat(data.endingBalance.toFixed(2));
  const difference = parseFloat((statedEndingBalance - calculatedEndingBalance).toFixed(2));
  const matches = Math.abs(difference) < 0.015; // Tolerance of 1.5 cents

  console.log(`Reconciliation Details - Start: ${data.startingBalance}, SumTx: ${sumOfTransactions.toFixed(2)}, CalcEnd: ${calculatedEndingBalance.toFixed(2)}, StatedEnd: ${statedEndingBalance.toFixed(2)}, Diff: ${difference.toFixed(2)}, Matches: ${matches}`);
  return { calculatedEndingBalance, difference, matches };
}

export async function POST(request: NextRequest) {
  console.log(`API Route: /api/parse-statement POST request received. Timestamp: ${new Date().toISOString()}`);
  try {
    const formData = await request.formData();
    const file = formData.get("pdfFile") as File | null;

    if (!file) {
      console.warn("API Validation Error: No file found in FormData.");
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      console.warn(`API Validation Error: Invalid file type received: ${file.type}. Expected 'application/pdf'.`);
      return NextResponse.json({ error: "Invalid file type. Please upload a PDF." }, { status: 400 });
    }
    console.log(`API Info: File received - Name: '${file.name}', Type: '${file.type}', Size: ${file.size} bytes.`);

    const fileBuffer = await file.arrayBuffer();
    console.log("API Info: File converted to ArrayBuffer.");

    const extractedText = await parsePdfToString(fileBuffer);

    if (!extractedText || extractedText.trim().length < 50) { 
        console.warn("API Warning: Extracted text is very short or empty. This might indicate an image-based PDF or a parsing issue.");
        return NextResponse.json({
            extractedData: {
                accountHolderName: "Parsing Issue",
                accountHolderAddress: "Extracted text was too short or empty. The PDF might be scanned, password-protected, or have no selectable text.",
                statementDate: "N/A", transactions: [], startingBalance: null, endingBalance: null,
                rawPdfText: extractedText.substring(0, 500) + (extractedText.length > 500 ? "..." : "")
            },
            reconciliation: { calculatedEndingBalance: null, difference: null, matches: false },
            message: "PDF parsed, but content was minimal or empty. Please ensure it's a text-based PDF."
        }, { status: 200 });
    }

    const llmExtractedData = await getDetailsFromLlm(extractedText);
    const reconciliationResult = performReconciliation(llmExtractedData);

    const responseData = {
      extractedData: {
        ...llmExtractedData,
        rawPdfText: extractedText.substring(0, 1000) + (extractedText.length > 1000 ? "..." : ""),
      },
      reconciliation: reconciliationResult,
      message: llmExtractedData.accountHolderName && llmExtractedData.accountHolderName.startsWith("Error: Gemini LLM Failed")
                 ? "PDF processed, but there was an issue with LLM data extraction."
                 : "PDF processed and LLM extraction complete."
    };

    console.log("API Info: Returning JSON response to client.");
    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error("API Error: An unhandled error occurred in the POST handler:", error);
    return NextResponse.json({
        error: "An unexpected server error occurred while processing the PDF.",
        details: error.message || "Unknown error."
    }, { status: 500 });
  }
}
