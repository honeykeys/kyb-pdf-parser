// src/app/api/parse-statement/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse'; // Import pdf-parse

// Define interfaces (ensure these are consistent with your frontend)
interface Transaction {
  date: string;
  description: string;
  amount: number;
}

interface ExtractedData {
  accountHolderName: string;
  accountHolderAddress: string;
  statementDate: string;
  transactions: Transaction[];
  startingBalance: number;
  endingBalance: number;
  rawPdfText?: string; // For debugging PDF parsing
}

interface ReconciliationResult {
  calculatedEndingBalance: number;
  difference: number;
  matches: boolean;
}

// Mock data shells for fields not yet populated by actual logic
const mockExtractedDataShell: Omit<ExtractedData, 'rawPdfText'> = {
  accountHolderName: "Pending LLM Analysis",
  accountHolderAddress: "Pending LLM Analysis",
  statementDate: "Pending LLM Analysis",
  transactions: [],
  startingBalance: 0,
  endingBalance: 0,
};

const mockReconciliationShell: ReconciliationResult = {
    calculatedEndingBalance: 0,
    difference: 0,
    matches: false,
};

export async function POST(request: NextRequest) {
  console.log(`API Route: /api/parse-statement POST request received. Timestamp: ${new Date().toISOString()}`);

  try {
    const formData = await request.formData();
    console.log("API Info: FormData processed successfully.");
    const file = formData.get("pdfFile") as File | null;

    // Validate file presence
    if (!file) {
      console.warn("API Validation Error: No file found in FormData.");
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }
    console.log(`API Info: File found in FormData - Name: '${file.name}', Type: '${file.type}', Size: ${file.size} bytes.`);

    // Validate file type
    if (file.type !== "application/pdf") {
      console.warn(`API Validation Error: Invalid file type received: ${file.type}. Expected 'application/pdf'.`);
      return NextResponse.json({ error: "Invalid file type. Please upload a PDF." }, { status: 400 });
    }

    // Get ArrayBuffer from the file
    let fileBuffer: ArrayBuffer;
    try {
        fileBuffer = await file.arrayBuffer();
        console.log("API Info: File successfully converted to ArrayBuffer.");
    } catch (bufferError: any) {
        console.error("API Error: Failed to convert file to ArrayBuffer.", bufferError);
        return NextResponse.json({ error: "Error reading file content.", details: bufferError.message || "Unknown error during file read." }, { status: 500 });
    }

    // Parse PDF to text using pdf-parse
    let extractedText = "";
    try {
      console.log("API Info: Attempting to parse PDF content with pdf-parse...");
      const data = await pdf(fileBuffer); // This is the call to pdf-parse
      extractedText = data.text;
      console.log(`API Info: PDF parsed successfully. Pages: ${data.numpages}. Extracted text length: ${extractedText.length}`);

      if (!extractedText || extractedText.trim() === "") {
        console.warn("API Warning: PDF parsed, but no text content was extracted. The PDF might be image-based, empty, or protected.");
      }
      // For debugging, you can log a snippet of the text:
      // console.log("Extracted text snippet (first 500 chars):", extractedText.substring(0, 500));
    } catch (parseError: any) {
      console.error("API Error: pdf-parse encountered an error during PDF processing.", parseError);
      // Log the full error object for more details, as parseError might not be a standard Error instance
      console.error("Full pdf-parse error object:", JSON.stringify(parseError, Object.getOwnPropertyNames(parseError)));
      return NextResponse.json({ error: "Error processing PDF file content.", details: parseError.message || "An unknown error occurred during PDF parsing." }, { status: 500 });
    }

    // Prepare the response data
    const responseData = {
      extractedData: {
        ...mockExtractedDataShell,
        // Include a snippet of the extracted text in the response for verification
        rawPdfText: extractedText.substring(0, 2000) + (extractedText.length > 2000 ? "..." : ""),
      },
      reconciliation: mockReconciliationShell,
      message: extractedText.trim() ? "Successfully parsed PDF text." : "PDF parsed, but no text content found (this may indicate an image-based or empty PDF)."
    };

    console.log("API Info: Successfully processed PDF. Returning JSON response with extracted text snippet.");
    return NextResponse.json(responseData);

  } catch (error: any) { // Catch-all for any other unexpected errors in the POST handler
    console.error("API Error: An unexpected and unhandled error occurred in the /api/parse-statement POST handler:", error);
    // Log the full error object for detailed debugging
    console.error("Full unhandled error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return NextResponse.json({ error: "An unexpected server error occurred.", details: error.message || "Unknown server error." }, { status: 500 });
  }
}
