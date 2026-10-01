'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogoMark, Icon } from './Icons';
import * as M from '../lib/re-data';
import type { Invoice } from '../lib/types';

interface Props {
  invoice: Invoice | null;
  onClose: () => void;
}

type Paper = 'a4' | 'thermal';

// An official receipt always shows every digit — never "1.2 Cr".
const money = (n: number) => M.fmt(n || 0, 'full');
const dateOr = (d: Date | string | null | undefined, fallback = '—') => (d ? M.fmtDate(d) : fallback);

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

/** Amount in words using the Pakistani crore / lakh grouping. */
function inWords(value: number): string {
  let n = Math.round(Math.abs(value || 0));
  if (n === 0) return 'Zero';
  const below1000 = (x: number): string => {
    const h = Math.floor(x / 100), r = x % 100;
    const tail = r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? ' ' + ONES[r % 10] : '');
    return [h ? ONES[h] + ' Hundred' : '', tail].filter(Boolean).join(' ');
  };
  const parts: string[] = [];
  const crore = Math.floor(n / 1e7); n %= 1e7;
  const lakh = Math.floor(n / 1e5); n %= 1e5;
  const thousand = Math.floor(n / 1e3); n %= 1e3;
  if (crore) parts.push((crore > 999 ? inWords(crore) : below1000(crore)) + ' Crore');
  if (lakh) parts.push(below1000(lakh) + ' Lakh');
  if (thousand) parts.push(below1000(thousand) + ' Thousand');
  if (n) parts.push(below1000(n));
  return parts.join(' ');
}

export function InvoiceReceiptModal({ invoice, onClose }: Props) {
  const [paper, setPaper] = useState<Paper>('a4');
  const slipRef = useRef<HTMLDivElement | null>(null);

  // While the voucher is open, printing prints the voucher and nothing else.
  useEffect(() => {
    if (!invoice) return;
    document.body.classList.add('receipt-open');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('receipt-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [invoice, onClose]);

  if (!invoice || typeof document === 'undefined') return null;

  const isSale = invoice.type === 'sale';
  const title = isSale ? 'Sale Receipt Voucher' : 'Purchase Payment Voucher';
  const copy = isSale ? 'Customer copy' : 'Company record copy';
  const serial = `${isSale ? 'SI' : 'PI'}-${String(invoice.srNo).padStart(4, '0')}`;
  const sellerName = invoice.sellerName || (isSale ? M.COMPANY : '');
  const paid = invoice.tokenAmount || 0;
  const settledInFull = (invoice.balanceAmount || 0) <= 0 && paid > 0;
  // The other party to the payment: the buyer who paid us, or the seller we paid.
  const partyName = isSale ? invoice.receivedFromName || invoice.buyerName : sellerName;
  const partyCnic = isSale ? invoice.receivedFromCnic || invoice.buyerCnic : invoice.sellerCnic;
  const purpose =
    (settledInFull ? 'Full and final payment' : 'Token / advance payment') +
    (invoice.propertyName ? ` against ${invoice.propertyName}` : ' against property');
  const watermark = M.COMPANY.split(/\s+/)
    .filter((w: string) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join('');

  const handlePrint = () => {
    // The page size has to match the paper: A4, or an 80 mm roll cut to the slip's length.
    const old = document.getElementById('receipt-page-size');
    if (old) old.remove();
    const style = document.createElement('style');
    style.id = 'receipt-page-size';
    if (paper === 'thermal') {
      const px = slipRef.current ? slipRef.current.scrollHeight : 900;
      const mm = Math.ceil((px * 25.4) / 96) + 8;
      style.textContent = `@media print { @page { size: 80mm ${mm}mm; margin: 0; } }`;
    } else {
      style.textContent = '@media print { @page { size: A4 portrait; margin: 12mm; } }';
    }
    document.head.appendChild(style);
    window.print();
  };

  const partyBox = (heading: string, name: string, company: string | undefined, cnic: string | undefined, bank: string | undefined) => (
    <div className="voucher-box">
      <div className="voucher-box-title">{heading}</div>
      <table className="voucher-table-mini">
        <tbody>
          <tr>
            <td>Name</td>
            <td><b>{name || '—'}</b></td>
          </tr>
          <tr>
            <td>Company</td>
            <td>{company || '—'}</td>
          </tr>
          <tr>
            <td>CNIC / NTN</td>
            <td className="mono">{cnic || '—'}</td>
          </tr>
          <tr>
            <td>Bank details</td>
            <td>{bank || '—'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return createPortal(
    <div className="receipt-modal-overlay" onClick={onClose}>
      <div
        className={`receipt-modal-card ${paper}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Action bar (hidden in print) */}
        <div className="receipt-modal-actions">
          <div className="receipt-modal-id">
            <span className={`tag ${isSale ? 'ok' : 'mute'}`}>{isSale ? 'Sale invoice' : 'Purchase invoice'}</span>
            <span>
              {invoice.id} · Serial {serial}
            </span>
          </div>
          <div className="receipt-modal-btns">
            <span className="seg" role="group" aria-label="Paper size">
              <button type="button" aria-pressed={paper === 'a4'} onClick={() => setPaper('a4')}>
                A4
              </button>
              <button type="button" aria-pressed={paper === 'thermal'} onClick={() => setPaper('thermal')}>
                Thermal 80mm
              </button>
            </span>
            <button type="button" className="btn pri" onClick={handlePrint}>
              <Icon name="print" /> Print / Save PDF
            </button>
            <button type="button" className="btn" onClick={onClose}>
              <Icon name="x" /> Close
            </button>
          </div>
        </div>

        <div className="receipt-modal-scroll">
          {paper === 'a4' ? (
            <div className="printable-voucher">
              <div className="vr-watermark" aria-hidden="true">
                {watermark}
              </div>

              {/* Company header & logo */}
              <div className="vr-head">
                <div className="vr-brand">
                  <div className="voucher-logo">
                    <LogoMark />
                  </div>
                  <div>
                    <h2>{M.COMPANY}</h2>
                    <span>Real Estate Investment &amp; Property Management</span>
                    {(M.COMPANY_ADDRESS || M.COMPANY_PHONE) && (
                      <span>{[M.COMPANY_ADDRESS, M.COMPANY_PHONE].filter(Boolean).join(' · ')}</span>
                    )}
                  </div>
                </div>
                <div className="vr-title">
                  <b>{isSale ? 'Receipt' : 'Payment Voucher'}</b>
                  <span>{copy}</span>
                </div>
              </div>
              <div className="vr-gold" />

              {/* Serial number & date */}
              <div className="vr-meta">
                <div className="vr-no">
                  <span>No.</span>
                  <b>{serial}</b>
                </div>
                <div>
                  <span>Invoice ref.</span>
                  <b>{invoice.id}</b>
                </div>
                <div>
                  <span>Date</span>
                  <b>{dateOr(invoice.receiptDate)}</b>
                </div>
              </div>

              {/* The receipt itself, worded as a receipt book is */}
              <div className="vr-lines">
                <p>
                  <span>{isSale ? 'Received with thanks from' : 'Paid to'}</span>
                  <b>{partyName || ' '}</b>
                  <span>CNIC</span>
                  <b className="fixed">{partyCnic || ' '}</b>
                </p>
                <p>
                  <span>the sum of Rupees</span>
                  <b>{inWords(paid)} Only</b>
                </p>
                <p>
                  <span>on account of</span>
                  <b>{purpose}</b>
                </p>
                <p>
                  <span>by</span>
                  <b className="fixed">{invoice.paymentMode || ' '}</b>
                  <span>Cheque / Ref. No.</span>
                  <b>{invoice.paymentRef || ' '}</b>
                  <span>dated</span>
                  <b className="fixed">{dateOr(invoice.paymentDate, dateOr(invoice.receiptDate))}</b>
                </p>
              </div>

              <div className="vr-amount-row">
                <div className="vr-amount">
                  <span>PKR</span>
                  <b>{M.fmtNum(paid)}/-</b>
                </div>
                <div className={`vr-seal ${settledInFull ? 'full' : ''}`}>{settledInFull ? 'Paid in full' : 'Part payment'}</div>
                <div className="vr-facts">
                  <div>
                    <span>Payment terms</span>
                    <b>{invoice.paymentTerms || '—'}</b>
                  </div>
                  <div>
                    <span>Transfer date</span>
                    <b>{dateOr(invoice.transferDate, 'To be scheduled')}</b>
                  </div>
                </div>
              </div>

              {/* Buyer & seller, side by side */}
              <div className="voucher-grid-2">
                {partyBox('Buyer', invoice.buyerName, invoice.buyerCompany, invoice.buyerCnic, invoice.bankDetailsBuyer)}
                {partyBox(
                  isSale ? 'Seller / Company' : 'Seller',
                  sellerName,
                  invoice.sellerCompany,
                  invoice.sellerCnic,
                  invoice.bankDetailsSeller
                )}
              </div>

              {/* Token & balance breakdown */}
              <table className="voucher-table-main">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Date</th>
                    <th className="r">Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Total agreed price{invoice.propertyName ? ` — ${invoice.propertyName}` : ''}</td>
                    <td>—</td>
                    <td className="r mono">{money(invoice.totalAmount)}</td>
                  </tr>
                  <tr>
                    <td>Token / advance {isSale ? 'received' : 'paid'}</td>
                    <td>{dateOr(invoice.tokenDate, dateOr(invoice.receiptDate))}</td>
                    <td className="r mono">{money(paid)}</td>
                  </tr>
                  <tr className="voucher-tot-row">
                    <td colSpan={2}>Balance due</td>
                    <td className="r mono">{money(invoice.balanceAmount)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="voucher-notes">
                <b>Terms &amp; acknowledgement</b>
                <ol>
                  <li>This is an official receipt of the payment noted above.</li>
                  <li>Payments by cheque, pay order or online transfer are subject to bank realisation.</li>
                  <li>Transfer of title or possession depends on full clearance of the balance due.</li>
                </ol>
                {invoice.notes && (
                  <p>
                    <b>Notes:</b> {invoice.notes}
                  </p>
                )}
              </div>

              {/* Physical signature & stamp boxes */}
              <div className="voucher-signatures">
                <div className="sig-box">
                  <div className="sig-space" />
                  <div className="sig-label">Received by</div>
                  <div className="sig-name">{invoice.receivedByName || ' '}</div>
                  <div className="sig-title">CNIC: {invoice.receivedByCnic || '________________'}</div>
                </div>
                <div className="sig-box">
                  <div className="sig-space">
                    <span className="stamp-box">Company stamp</span>
                  </div>
                  <div className="sig-label">Approved by</div>
                  <div className="sig-name">{invoice.approvedByName || ' '}</div>
                  <div className="sig-title">Authorised signatory</div>
                </div>
                <div className="sig-box">
                  <div className="sig-space" />
                  <div className="sig-label">Buyer signature</div>
                  <div className="sig-name">{invoice.receivedFromName || invoice.buyerName || ' '}</div>
                  <div className="sig-title">CNIC: {invoice.receivedFromCnic || invoice.buyerCnic || '________________'}</div>
                </div>
              </div>

              <div className="voucher-footer">
                <span>Thank you for your business</span>
                <span>Computer-generated · valid with signature and company stamp · Printed {M.fmtDate(new Date())}</span>
              </div>
            </div>
          ) : (
            <div className="thermal-slip" ref={slipRef}>
              <div className="ts-center">
                <b className="ts-co">{M.COMPANY}</b>
                {M.COMPANY_ADDRESS && <span>{M.COMPANY_ADDRESS}</span>}
                {M.COMPANY_PHONE && <span>{M.COMPANY_PHONE}</span>}
                <b className="ts-title">{title}</b>
              </div>
              <div className="ts-rule" />
              <div className="ts-row"><span>Serial No.</span><b>{serial}</b></div>
              <div className="ts-row"><span>Invoice</span><b>{invoice.id}</b></div>
              <div className="ts-row"><span>Date</span><b>{dateOr(invoice.receiptDate)}</b></div>
              <div className="ts-rule" />
              <div className="ts-head">Buyer</div>
              <div className="ts-row"><span>Name</span><b>{invoice.buyerName || '—'}</b></div>
              <div className="ts-row"><span>CNIC</span><b>{invoice.buyerCnic || '—'}</b></div>
              {invoice.bankDetailsBuyer && <div className="ts-row"><span>Bank</span><b>{invoice.bankDetailsBuyer}</b></div>}
              <div className="ts-head">Seller</div>
              <div className="ts-row"><span>Name</span><b>{sellerName || '—'}</b></div>
              <div className="ts-row"><span>CNIC/NTN</span><b>{invoice.sellerCnic || '—'}</b></div>
              {invoice.bankDetailsSeller && <div className="ts-row"><span>Bank</span><b>{invoice.bankDetailsSeller}</b></div>}
              <div className="ts-rule" />
              <div className="ts-row"><span>Property</span><b>{invoice.propertyName || '—'}</b></div>
              <div className="ts-row"><span>Pay mode</span><b>{invoice.paymentMode || '—'}</b></div>
              {invoice.paymentRef && <div className="ts-row"><span>Ref.</span><b>{invoice.paymentRef}</b></div>}
              {invoice.paymentTerms && <div className="ts-row"><span>Terms</span><b>{invoice.paymentTerms}</b></div>}
              <div className="ts-rule" />
              <div className="ts-row"><span>Total price</span><b>{money(invoice.totalAmount)}</b></div>
              <div className="ts-row"><span>Token {isSale ? 'received' : 'paid'}</span><b>{money(paid)}</b></div>
              <div className="ts-row ts-total"><span>Balance due</span><b>{money(invoice.balanceAmount)}</b></div>
              <div className="ts-words">Rupees {inWords(paid)} Only</div>
              <div className="ts-rule" />
              <div className="ts-sig"><i />Received by{invoice.receivedByName ? ` — ${invoice.receivedByName}` : ''}</div>
              <div className="ts-sig"><i />Approved by{invoice.approvedByName ? ` — ${invoice.approvedByName}` : ''} (stamp)</div>
              <div className="ts-sig"><i />Buyer signature</div>
              <div className="ts-center ts-foot">Printed {M.fmtDate(new Date())}</div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
