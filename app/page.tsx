"use client";

import { useState, ChangeEvent, FormEvent } from 'react';
import Image from 'next/image';

interface Transaction {
  date: string;
  description: string;
  amount: number;
}

interface ExtractedData {
  accountHolderName: string | null;
  accountHolderAddress: string | null;
  statementDate: string | null;
  currency: string | null;
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

interface ApiResponse {
  extractedData?: ExtractedData;
  reconciliation?: ReconciliationResult;
  message?: string;
  error?: string;
  llmResponse?: any;
}

const styles: { [key: string]: React.CSSProperties } = {
  mainContainer: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', padding: '20px', backgroundColor: 'var(--pooh-yellow)',
    color: 'var(--pooh-text-dark)', fontFamily: 'var(--font-inter, Arial, sans-serif)',
  },
  card: {
    width: '100%', maxWidth: '800px', backgroundColor: 'var(--pooh-input-bg)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '12px',
    padding: '30px', border: '2px solid var(--pooh-input-border)',
  },
  header: { textAlign: 'center', marginBottom: '30px' },
  title: { fontSize: '2.2rem', fontWeight: 'bold', color: 'var(--pooh-text-header)', marginBottom: '8px' },
  subtitle: { color: 'var(--pooh-text-dark)', opacity: 0.8, fontSize: '1rem' },
  formGroup: { marginBottom: '20px' },
  label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--pooh-text-header)' },
  fileInputButton: {
    display: 'inline-flex', alignItems: 'center', padding: '10px 18px',
    backgroundColor: 'var(--pooh-red)', color: 'var(--pooh-text-on-dark)',
    borderRadius: '8px', cursor: 'pointer', border: 'none', fontSize: '1rem',
    transition: 'background-color 0.2s ease-in-out',
  },
  fileInputButtonHover: { backgroundColor: 'var(--pooh-button-hover)' },
  fileName: { marginLeft: '12px', color: 'var(--pooh-text-dark)', opacity: 0.9, fontStyle: 'italic' },
  submitButton: {
    padding: '12px 20px', backgroundColor: 'var(--pooh-red)', color: 'var(--pooh-text-on-dark)',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', width: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background-color 0.2s ease-in-out',
  },
  buttonDisabled: {
    backgroundColor: 'var(--pooh-disabled-bg)', color: 'var(--pooh-disabled-text)',
    cursor: 'not-allowed',
  },
  loadingSpinner: {
    width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)',
    borderTopColor: 'var(--pooh-text-on-dark)', borderRadius: '50%', display: 'inline-block',
    animation: 'spin 1s linear infinite', marginRight: '10px',
  },
  errorBox: {
    marginTop: '20px', padding: '15px', backgroundColor: 'var(--pooh-error-bg)',
    color: 'var(--pooh-error-text)', borderRadius: '8px', border: '1px solid var(--pooh-red)',
  },
  resultsContainer: {
    marginTop: '30px', padding: '25px', backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: '8px', border: '1px solid var(--pooh-input-border)',
  },
  resultsTitle: {
    fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--pooh-text-header)',
    borderBottom: '2px solid var(--pooh-input-border)', paddingBottom: '10px', marginBottom: '20px',
  },
  dataItem: { marginBottom: '15px' },
  dataLabel: {
    fontWeight: 'bold', color: 'var(--pooh-text-header)', opacity: 0.85, display: 'block',
    fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '4px',
  },
  dataValue: { fontSize: '1.05rem', color: 'var(--pooh-text-dark)' },
  preformattedText: {
    backgroundColor: 'var(--pooh-table-row-alt)', padding: '12px', borderRadius: '6px',
    overflowX: 'auto', maxHeight: '150px', fontSize: '0.8rem',
    border: '1px solid var(--pooh-input-border)', color: 'var(--pooh-text-dark)',
    whiteSpace: 'pre-wrap', wordBreak: 'break-all',
  },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
  th: {
    borderBottom: '2px solid var(--pooh-text-header)', padding: '12px 10px', textAlign: 'left',
    backgroundColor: 'var(--pooh-table-header-bg)', color: 'var(--pooh-text-dark)',
    fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase',
  },
  td: {
    borderBottom: '1px solid var(--pooh-input-border)', padding: '10px 10px',
    fontSize: '0.95rem', color: 'var(--pooh-text-dark)',
  },
  transactionAmountNegative: { color: 'var(--pooh-error-bg)', fontWeight: 'bold' },
  transactionAmountPositive: { color: 'var(--pooh-success-bg)', fontWeight: 'bold' },
  reconciliationBox: {
    marginTop: '25px', padding: '20px', borderRadius: '8px',
    color: 'var(--pooh-text-on-dark)', borderTop: '1px solid var(--pooh-input-border)', paddingTop: '20px',
  },
  reconciliationMatch: { backgroundColor: 'var(--pooh-success-bg)' },
  reconciliationMismatch: { backgroundColor: 'var(--pooh-error-bg)' },
  footer: { marginTop: '40px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--pooh-text-dark)', opacity: 0.7 }
};

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [isSubmitHovered, setIsSubmitHovered] = useState(false);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile); setFileName(selectedFile.name); setError(null); setApiResponse(null);
      } else {
        setFile(null); setFileName(""); setError("Please select a PDF file."); setApiResponse(null);
      }
    } else {
      setFile(null); setFileName(""); setApiResponse(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) { setError("Please select a PDF file to upload."); return; }
    setIsLoading(true); setApiResponse(null); setError(null);
    const formData = new FormData(); formData.append("pdfFile", file);
    try {
      const response = await fetch('/api/parse-statement', { method: 'POST', body: formData });
      const result: ApiResponse = await response.json();
      if (!response.ok) throw new Error(result.error || `API Error: ${response.statusText} (Status: ${response.status})`);
      setApiResponse(result);
    } catch (err: any) {
      console.error("Submission error:", err);
      setError(err.message || "An unexpected error occurred."); setApiResponse(null);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number | undefined | null, currencyCode: string | undefined | null) => {
    if (value === undefined || value === null) return 'N/A';
    const options: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: currencyCode || 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    };
    try {
      return value.toLocaleString(undefined, options);
    } catch (e) {
      console.warn("Invalid currency code for formatting:", currencyCode, "Defaulting display.");
      return `${currencyCode || ''} ${value.toFixed(2)}`;
    }
  };

  const fileInputButtonStyle = { ...styles.fileInputButton, ...(isButtonHovered ? styles.fileInputButtonHover : {}) };
  const submitButtonStyle = { ...styles.submitButton, ...((isLoading || !file) ? styles.buttonDisabled : (isSubmitHovered ? styles.fileInputButtonHover : {})) };

  return (
    <main style={styles.mainContainer}>
      <div style={styles.card}>
        <header style={styles.header}>
          <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'center' }}>
            <Image src="/kypooh.svg" alt="KYPooh Icon" width={70} height={70} priority />
          </div>
          <h1 style={styles.title}>KYB PDF Statement Parser</h1>
          <p style={styles.subtitle}>Upload a bank statement PDF to extract details and verify balances.</p>
        </header>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label htmlFor="pdfFile" style={styles.label}>Select Bank Statement (PDF only)</label>
            <input type="file" id="pdfFile" name="pdfFile" accept=".pdf" onChange={handleFileChange} style={{ display: 'none' }} />
            <button type="button" onClick={() => document.getElementById('pdfFile')?.click()} style={fileInputButtonStyle} onMouseEnter={() => setIsButtonHovered(true)} onMouseLeave={() => setIsButtonHovered(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              Choose File
            </button>
            {fileName && <span style={styles.fileName}>{fileName}</span>}
          </div>
          <button type="submit" disabled={isLoading || !file} style={submitButtonStyle} onMouseEnter={() => setIsSubmitHovered(true)} onMouseLeave={() => setIsSubmitHovered(false)}>
            {isLoading ? (<><span style={styles.loadingSpinner} />Processing...</>) : 'Parse Statement'}
          </button>
        </form>

        {error && (
          <div style={styles.errorBox}><p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Error:</p><p>{error}</p></div>
        )}

        {apiResponse && !error && (
          <div style={styles.resultsContainer}>
            <h2 style={styles.resultsTitle}>Extracted Information</h2>
            {apiResponse.message && <p style={{ fontStyle: 'italic', marginBottom: '15px', color: 'var(--pooh-text-dark)' }}>{apiResponse.message}</p>}
            
            {apiResponse.extractedData?.currency && (
              <div style={styles.dataItem}>
                <span style={styles.dataLabel}>Detected Currency:</span>
                <span style={styles.dataValue}>{apiResponse.extractedData.currency}</span>
              </div>
            )}

            {apiResponse.extractedData?.rawPdfText && (
              <div style={{ ...styles.dataItem, marginBottom: '20px' }}>
                <h3 style={styles.dataLabel}>Raw Extracted Text (Snippet):</h3>
                <pre style={styles.preformattedText}>{apiResponse.extractedData.rawPdfText}</pre>
              </div>
            )}

            {apiResponse.extractedData && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                  <div style={styles.dataItem}><span style={styles.dataLabel}>Account Holder:</span> <span style={styles.dataValue}>{apiResponse.extractedData.accountHolderName || 'N/A'}</span></div>
                  <div style={styles.dataItem}><span style={styles.dataLabel}>Statement Date:</span> <span style={styles.dataValue}>{apiResponse.extractedData.statementDate || 'N/A'}</span></div>
                  <div style={{...styles.dataItem, gridColumn: '1 / -1'}}><span style={styles.dataLabel}>Address:</span> <span style={styles.dataValue}><pre style={{margin:0, padding:0, background:'none', border:'none', fontFamily:'inherit', fontSize:'inherit', color:'inherit'}}>{apiResponse.extractedData.accountHolderAddress || 'N/A'}</pre></span></div>
                  <div style={styles.dataItem}><span style={styles.dataLabel}>Starting Balance:</span> <span style={styles.dataValue}>{formatCurrency(apiResponse.extractedData.startingBalance, apiResponse.extractedData.currency)}</span></div>
                  <div style={styles.dataItem}><span style={styles.dataLabel}>Ending Balance (Stated):</span> <span style={styles.dataValue}>{formatCurrency(apiResponse.extractedData.endingBalance, apiResponse.extractedData.currency)}</span></div>
                </div>

                <div>
                  <h3 style={{...styles.dataLabel, fontSize: '1.3rem', color: 'var(--pooh-text-header)', marginTop: '25px', marginBottom: '10px' }}>Transactions</h3>
                  {apiResponse.extractedData.transactions && apiResponse.extractedData.transactions.length > 0 ? (
                    <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--pooh-input-border)', borderRadius: '6px' }}>
                      <table style={styles.table}>
                        <thead style={{position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'var(--pooh-table-header-bg)' }}>
                          <tr>
                            <th style={styles.th}>Date</th><th style={styles.th}>Description</th><th style={{...styles.th, textAlign: 'right'}}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {apiResponse.extractedData.transactions.map((tx, index) => (
                            <tr key={index} style={index % 2 === 0 ? { backgroundColor: 'var(--pooh-input-bg)' } : { backgroundColor: 'var(--pooh-table-row-alt)' }}>
                              <td style={styles.td}>{tx.date}</td>
                              <td style={styles.td}>{tx.description}</td>
                              <td style={{...styles.td, textAlign: 'right', ...(tx.amount < 0 ? styles.transactionAmountNegative : styles.transactionAmountPositive)}}>
                                {formatCurrency(tx.amount, apiResponse.extractedData?.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : ( <p style={{ fontStyle: 'italic', color: 'var(--pooh-text-dark)', opacity: 0.8 }}>{apiResponse.extractedData.rawPdfText ? 'No transactions extracted (yet).' : 'Upload a PDF to see transactions.'}</p> )}
                </div>
              </>
            )}

            {apiResponse.reconciliation && apiResponse.extractedData && (
              <div style={{ ...styles.reconciliationBox, ...(apiResponse.reconciliation.matches ? styles.reconciliationMatch : styles.reconciliationMismatch) }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '10px', color: 'var(--pooh-text-on-dark)' }}>Balance Reconciliation</h3>
                <p style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '8px', color: 'var(--pooh-text-on-dark)' }}>
                  {apiResponse.reconciliation.matches ? '✅ Balances Reconcile!' : '❌ Balances DO NOT Reconcile!'}
                </p>
                <div style={{ fontSize: '0.95rem', color: 'var(--pooh-text-on-dark)' }}>
                  <p>Stated Ending Balance: <strong>{formatCurrency(apiResponse.extractedData.endingBalance, apiResponse.extractedData.currency)}</strong></p>
                  <p>Calculated Ending Balance (Start + Transactions): <strong>{formatCurrency(apiResponse.reconciliation.calculatedEndingBalance, apiResponse.extractedData.currency)}</strong></p>
                  <p>Difference: <strong style={apiResponse.reconciliation.difference !== 0 && !apiResponse.reconciliation.matches ? { color: 'var(--pooh-yellow)'} : {}}>{formatCurrency(apiResponse.reconciliation.difference, apiResponse.extractedData.currency)}</strong></p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <footer style={styles.footer}><p> Karl Nuyda (honeykeys) - &copy; {new Date().getFullYear()}</p></footer>
      <style jsx global>{` @keyframes spin { to { transform: rotate(360deg); } } `}</style>
    </main>
  );
}
