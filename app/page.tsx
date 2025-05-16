// src/app/page.tsx
"use client"; // This directive is necessary for Next.js App Router client components

import { useState, ChangeEvent, FormEvent } from 'react';

// Define interfaces for the expected API response structure
// These should match the interfaces in your API route
interface Transaction {
  date: string;
  description: string;
  amount: number; // Assuming amount can be positive (credit) or negative (debit)
}

interface ExtractedData {
  accountHolderName: string;
  accountHolderAddress: string;
  statementDate: string;
  transactions: Transaction[];
  startingBalance: number;
  endingBalance: number;
  rawPdfText?: string; // For displaying the extracted text snippet from pdf-parse
}

interface ReconciliationResult {
  calculatedEndingBalance: number;
  difference: number;
  matches: boolean;
}

// Interface for the overall API response
interface ApiResponse {
  extractedData?: ExtractedData; // Make optional if error occurs
  reconciliation?: ReconciliationResult; // Make optional if error occurs
  message?: string; // General message from API
  error?: string; // Error message from API
  llmResponse?: any; // Optional: for debugging LLM raw output (kept for future use)
}

export default function HomePage() {
  // State for the selected file
  const [file, setFile] = useState<File | null>(null);
  // State to indicate if the API call is in progress
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // State to store the API response
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  // State to store any errors during file selection or API call
  const [error, setError] = useState<string | null>(null);

  // Handles changes to the file input
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      // Validate if the selected file is a PDF
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setError(null); // Clear any previous file type errors
        setApiResponse(null); // Clear previous results when a new file is selected
      } else {
        setFile(null); // Reset file if not a PDF
        setError("Please select a PDF file.");
        setApiResponse(null);
      }
    } else {
      setFile(null); // Clear file if selection is cancelled
      setApiResponse(null); // Clear previous results
    }
  };

  // Handles the form submission
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent default browser form submission

    if (!file) {
      setError("Please select a PDF file to upload.");
      return;
    }

    setIsLoading(true); // Set loading state to true
    setApiResponse(null); // Clear previous API response
    setError(null); // Clear previous errors

    const formData = new FormData();
    formData.append("pdfFile", file); // Append the file to FormData

    try {
      // Make the API call to the backend
      const response = await fetch('/api/parse-statement', {
        method: 'POST',
        body: formData,
      });

      // Parse the JSON response from the API
      const result: ApiResponse = await response.json();

      if (!response.ok) {
        // If response is not OK, throw an error with the message from API or status text
        throw new Error(result.error || `API Error: ${response.statusText} (Status: ${response.status})`);
      }

      setApiResponse(result); // Set the API response state
    } catch (err: any) {
      console.error("Submission error:", err);
      // Set error state with the message from the caught error
      setError(err.message || "An unexpected error occurred during processing.");
      setApiResponse(null); // Clear API response on error
    } finally {
      setIsLoading(false); // Set loading state to false regardless of outcome
    }
  };

  // Helper function to format currency
  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'N/A';
    // Assuming USD for now, can be made dynamic later
    return value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  };


  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white font-sans">
      <div className="w-full max-w-3xl bg-slate-800 shadow-2xl rounded-xl p-6 sm:p-8">
        <header className="mb-8 text-center">
          {/* Optional: You can add a simple SVG logo here if you create one */}
          {/* <img src="/kyb-logo.svg" alt="KYB Logo" className="h-12 w-auto mx-auto mb-4" /> */}
          <h1 className="text-3xl sm:text-4xl font-bold text-sky-400">
            KYB PDF Statement Parser
          </h1>
          <p className="text-slate-400 mt-2 text-sm sm:text-base">
            Upload a bank statement PDF to extract details and verify balances.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="pdfFile" className="block text-sm font-medium text-sky-300 mb-2">
              Select Bank Statement (PDF only)
            </label>
            <input
              type="file"
              id="pdfFile"
              name="pdfFile" // Good practice to include name attribute
              accept=".pdf" // Restrict file types in browser dialog
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-300
                         file:mr-4 file:py-3 file:px-6
                         file:rounded-lg file:border-0
                         file:text-sm file:font-semibold
                         file:bg-sky-600 file:text-white
                         hover:file:bg-sky-700
                         focus:outline-none focus:ring-2 focus:ring-sky-500
                         cursor-pointer transition-colors duration-150"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !file} // Disable button when loading or no file selected
            className="w-full flex items-center justify-center bg-green-500 hover:bg-green-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : 'Parse Statement'}
          </button>
        </form>

        {/* Display Error Messages */}
        {error && (
          <div className="mt-6 p-4 bg-red-800 bg-opacity-50 border border-red-600 text-red-200 rounded-lg" role="alert">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {/* Display API Response */}
        {apiResponse && !error && (
          <div className="mt-8 p-6 bg-slate-700 rounded-lg shadow-inner space-y-6">
            <h2 className="text-2xl font-semibold text-sky-300 border-b border-slate-600 pb-3 mb-4">
              Extracted Information
            </h2>

            {/* Display general message from API if available */}
            {apiResponse.message && (
                 <p className="text-slate-300 italic mb-4">{apiResponse.message}</p>
            )}

            {/* Display Raw PDF Text Snippet for Debugging */}
            {apiResponse.extractedData?.rawPdfText && (
              <div className="mt-4 mb-6 p-4 bg-slate-900 rounded-md">
                <h3 className="text-sm font-medium text-sky-400 mb-2">Raw Extracted Text (Snippet from PDF):</h3>
                <pre className="text-xs text-slate-300 overflow-x-auto max-h-40 whitespace-pre-wrap break-all">
                  {apiResponse.extractedData.rawPdfText}
                </pre>
              </div>
            )}

            {/* Display other extracted data if available */}
            {apiResponse.extractedData && (
              <>
                {/* Account Holder and Statement Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Account Holder</h3>
                    <p className="text-lg text-slate-100">{apiResponse.extractedData.accountHolderName || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Statement Date</h3>
                    <p className="text-lg text-slate-100">{apiResponse.extractedData.statementDate || 'N/A'}</p>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Address</h3>
                  <p className="text-lg text-slate-100 whitespace-pre-wrap">{apiResponse.extractedData.accountHolderAddress || 'N/A'}</p>
                </div>

                {/* Balances */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Starting Balance</h3>
                        <p className="text-lg text-slate-100">{formatCurrency(apiResponse.extractedData.startingBalance)}</p>
                    </div>
                    <div>
                        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Ending Balance (Stated)</h3>
                        <p className="text-lg text-slate-100">{formatCurrency(apiResponse.extractedData.endingBalance)}</p>
                    </div>
                </div>

                {/* Transactions Table */}
                <div>
                  <h3 className="text-xl font-semibold text-sky-400 mt-6 mb-3">Transactions</h3>
                  {apiResponse.extractedData.transactions && apiResponse.extractedData.transactions.length > 0 ? (
                    <div className="overflow-x-auto rounded-md border border-slate-600 max-h-96"> {/* Added max-h-96 for scrollability */}
                      <table className="min-w-full divide-y divide-slate-600">
                        <thead className="bg-slate-800 sticky top-0"> {/* Sticky header for scrollable table */}
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-sky-300 uppercase tracking-wider">Date</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-sky-300 uppercase tracking-wider">Description</th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-sky-300 uppercase tracking-wider">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="bg-slate-700 divide-y divide-slate-600">
                          {apiResponse.extractedData.transactions.map((tx, index) => (
                            <tr key={index} className={`${index % 2 === 0 ? 'bg-slate-700' : 'bg-slate-750'} hover:bg-slate-650 transition-colors duration-150`}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">{tx.date}</td>
                              <td className="px-4 py-3 text-sm text-slate-300 break-words">{tx.description}</td>
                              <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${tx.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {formatCurrency(tx.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">
                      {apiResponse.extractedData.rawPdfText ? 'No transactions extracted (yet).' : 'Upload a PDF to see transactions.'}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Reconciliation Section */}
            {apiResponse.reconciliation && apiResponse.extractedData && ( // Ensure extractedData is also present for context
              <div className="mt-6 pt-6 border-t border-slate-600">
                <h2 className="text-xl font-semibold text-sky-300 mb-3">
                  Balance Reconciliation
                </h2>
                <div className={`p-4 rounded-lg text-white ${apiResponse.reconciliation.matches ? 'bg-green-600 bg-opacity-80 border-green-500' : 'bg-red-600 bg-opacity-80 border-red-500'}`}>
                  <p className="font-semibold text-lg mb-2">
                    {apiResponse.reconciliation.matches
                      ? '✅ Balances Reconcile!'
                      : '❌ Balances DO NOT Reconcile! (Or not yet calculated)'}
                  </p>
                  <div className="text-sm space-y-1">
                    <p>Stated Ending Balance: <span className="font-medium">{formatCurrency(apiResponse.extractedData.endingBalance)}</span></p>
                    <p>Calculated Ending Balance (Start + Transactions): <span className="font-medium">{formatCurrency(apiResponse.reconciliation.calculatedEndingBalance)}</span></p>
                    <p>Difference: <span className={`font-medium ${apiResponse.reconciliation.difference !== 0 ? 'text-yellow-300' : ''}`}>{formatCurrency(apiResponse.reconciliation.difference)}</span></p>
                  </div>
                </div>
              </div>
            )}

            {/* Optional: Display raw LLM response for debugging - useful during development */}
            {/* {process.env.NODE_ENV === 'development' && apiResponse.llmResponse && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-sky-400">Raw LLM Response (Debug)</h3>
                <pre className="bg-slate-900 p-4 rounded-md text-xs overflow-x-auto max-h-60">
                  {JSON.stringify(apiResponse.llmResponse, null, 2)}
                </pre>
              </div>
            )} */}

          </div>
        )}
      </div>
      <footer className="mt-12 text-center text-sm text-slate-500">
        <p>KYB PDF Parser MVP - &copy; {new Date().getFullYear()}</p>
      </footer>
    </main>
  );
}
