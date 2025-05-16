// src/app/api/parse-statement/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Define interfaces for the expected data structure (can be shared with frontend)
// These will be more fleshed out as we integrate the LLM
interface Transaction {
  date: string;
  description: string;
  amount: number; // Positive for credits, negative for debits
}

interface ExtractedData {
  accountHolderName: string;
  accountHolderAddress: string;
  statementDate: string;
  transactions: Transaction[];
  startingBalance: number;
  endingBalance: number;
}

interface ReconciliationResult {
  calculatedEndingBalance: number;
  difference: number;
  matches: boolean;
}

// Mock data for initial development and testing the frontend connection
const mockExtractedData: ExtractedData = {
  accountHolderName: "Jane Doe (Mock)",
  accountHolderAddress: "456 Mockingbird Lane, Testville, TX 75001",
  statementDate: "2024-01-15",
  transactions: [
    { date: "2024-01-01", description: "Initial Mock Balance", amount: 1200.00 },
    { date: "2024-01-05", description: "Mock Deposit", amount: 500.00 },
    { date: "2024-01-10", description: "Mock Withdrawal", amount: -150.00 },
  ],
  startingBalance: 1200.00,
  endingBalance: 1550.00, // 1200 + 500 - 150
};

const mockReconciliation: ReconciliationResult = {
    calculatedEndingBalance: 1550.00,
    difference: 0,
    matches: true,
};

export async function POST(request: NextRequest) {
  console.log("API Route: /api/parse-statement POST request received.");

  try {
    const formData = await request.formData();
    const file = formData.get("pdfFile") as File | null;

    // 1. Validate file presence
    if (!file) {
      console.log("API Error: No file received.");
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    // 2. Validate file type
    if (file.type !== "application/pdf") {
      console.log(`API Error: Invalid file type received: ${file.type}`);
      return NextResponse.json({ error: "Invalid file type. Please upload a PDF." }, { status: 400 });
    }

    console.log(`API Info: File received - Name: ${file.name}, Size: ${file.size}, Type: ${file.type}`);

    // --- Placeholder for future logic ---
    // Step 1: PDF-to-Text Extraction (e.g., using pdf-parse)
    // const fileBuffer = await file.arrayBuffer();
    // const extractedText = await parsePdfToString(fileBuffer); // This function will be implemented next

    // Step 2: LLM Interaction
    // const llmResponseData = await getDetailsFromLlm(extractedText); // This function will be implemented later

    // Step 3: Reconciliation
    // const reconciliationResult = performReconciliation(llmResponseData); // This function will be implemented later
    // --- End Placeholder ---

    // For now, return the mock data
    console.log("API Info: Returning mock data for now.");
    return NextResponse.json({
      extractedData: mockExtractedData,
      reconciliation: mockReconciliation,
      message: "Successfully processed PDF (mock response)." // Added a general message
    });

  } catch (error) {
    console.error("API Error: An error occurred in /api/parse-statement:", error);
    let errorMessage = "An unexpected error occurred on the server.";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Future helper function stubs (we'll implement these in subsequent steps):
// async function parsePdfToString(fileBuffer: ArrayBuffer): Promise<string> {
//   // Implementation using pdf-parse will go here
//   throw new Error("parsePdfToString not yet implemented");
// }

// async function getDetailsFromLlm(text: string): Promise<ExtractedData> {
//   // Implementation for calling OpenAI API will go here
//   throw new Error("getDetailsFromLlm not yet implemented");
// }

// function performReconciliation(data: ExtractedData): ReconciliationResult {
//   // Implementation for calculating and comparing balances will go here
//   throw new Error("performReconciliation not yet implemented");
// }
