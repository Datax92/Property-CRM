'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icons';
import { BrandBanner, BrandFooter, BrandMark } from './Brand';
import { PrintNow } from './PrintNow';
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

/** Everything the voucher prints that depends on the kind of invoice. */
function voucherInfo(invoice: Invoice) {
  const proforma = invoice.type === 'proforma';
  const isSale = invoice.type !== 'purchase';
  const sellerName = invoice.sellerName || (isSale ? M.COMPANY : '');
  const paid = invoice.tokenAmount || 0;
  const settledInFull = !proforma && (invoice.balanceAmount || 0) <= 0 && paid > 0;
  return {
    isSale,
    proforma,
    sellerName,
    paid,
    settledInFull,
    title: proforma ? 'Proforma Invoice' : isSale ? 'Sale Receipt Voucher' : 'Purchase Payment Voucher',
    heading: proforma ? 'Proforma Invoice' : isSale ? 'Receipt' : 'Payment Voucher',
    copy: proforma ? 'Quotation · not a receipt' : isSale ? 'Customer copy' : 'Company record copy',
    serial: `${proforma ? 'PF' : isSale ? 'SI' : 'PI'}-${String(invoice.srNo).padStart(4, '0')}`,
    // The other party to the payment: the buyer who paid us, or the seller we paid.
    partyName: isSale ? invoice.receivedFromName || invoice.buyerName : sellerName,
    partyCnic: isSale ? invoice.receivedFromCnic || invoice.buyerCnic : invoice.sellerCnic,
    purpose: proforma
      ? `Proposed sale of ${invoice.propertyName || 'property'}`
      : (settledInFull ? 'Full and final payment' : 'Token / advance payment') +
        (invoice.propertyName ? ` against ${invoice.propertyName}` : ' against property'),
  };
}

/** The A4 voucher, on the company letterhead. */
export function VoucherA4({ invoice }: { invoice: Invoice }) {
  const v = voucherInfo(invoice);
  const { isSale, proforma, paid } = v;
  // A proforma quotes the whole price; a receipt states the money that changed hands.
  const sum = proforma ? invoice.totalAmount || 0 : paid;

  const partyBox = (heading: string, name: string, company?: string, cnic?: string, bank?: string) => (
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

  return (
    <div className="printable-voucher">
      <div className="vr-watermark" aria-hidden="true">
        <BrandMark size={380} />
      </div>

      <div className="vr-letterhead">
        <BrandBanner />
      </div>
      <div className="vr-titlebar">
        <b>{v.heading}</b>
        <span>{v.copy}</span>
      </div>

      {/* Serial number & date */}
      <div className="vr-meta">
        <div className="vr-no">
          <span>No.</span>
          <b>{v.serial}</b>
        </div>
        <div>
          <span>Invoice ref.</span>
          <b>{invoice.id}</b>
          {invoice.mirrorOf && <em className="vr-mirror">Mirror of {invoice.mirrorOf}</em>}
        </div>
        <div>
          <span>Date</span>
          <b>{dateOr(invoice.receiptDate)}</b>
        </div>
      </div>

      {/* The receipt itself, worded as a receipt book is */}
      <div className="vr-lines">
        <p>
          <span>{proforma ? 'Issued to' : isSale ? 'Received with thanks from' : 'Paid to'}</span>
          <b>{v.partyName || ' '}</b>
          <span>CNIC</span>
          <b className="fixed">{v.partyCnic || ' '}</b>
        </p>
        <p>
          <span>{proforma ? 'for the sum of Rupees' : 'the sum of Rupees'}</span>
          <b>{inWords(sum)} Only</b>
        </p>
        <p>
          <span>on account of</span>
          <b>{v.purpose}</b>
        </p>
        {!proforma && (
          <p>
            <span>by</span>
            <b className="fixed">{invoice.paymentMode || ' '}</b>
            <span>Cheque / Ref. No.</span>
            <b>{invoice.paymentRef || ' '}</b>
            <span>dated</span>
            <b className="fixed">{dateOr(invoice.paymentDate, dateOr(invoice.receiptDate))}</b>
          </p>
        )}
      </div>

      <div className="vr-amount-row">
        <div className="vr-amount">
          <span>PKR</span>
          <b>{M.fmtNum(sum)}/-</b>
        </div>
        <div className={`vr-seal ${v.settledInFull ? 'full' : ''}`}>
          {proforma ? 'Proforma' : v.settledInFull ? 'Paid in full' : 'Part payment'}
        </div>
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
        {partyBox(isSale ? 'Seller / Company' : 'Seller', v.sellerName, invoice.sellerCompany, invoice.sellerCnic, invoice.bankDetailsSeller)}
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
            <td>Token / advance {proforma ? 'payable' : isSale ? 'received' : 'paid'}</td>
            <td>{dateOr(invoice.tokenDate, proforma ? '—' : dateOr(invoice.receiptDate))}</td>
            <td className="r mono">{money(paid)}</td>
          </tr>
          <tr className="voucher-tot-row">
            <td colSpan={2}>{proforma ? 'Balance payable on transfer' : 'Balance due'}</td>
            <td className="r mono">{money(invoice.balanceAmount)}</td>
          </tr>
        </tbody>
      </table>

      <div className="voucher-notes">
        <b>Terms &amp; acknowledgement</b>
        {proforma ? (
          <ol>
            <li>This proforma invoice is a quotation. It is not a receipt and no payment has been received against it.</li>
            <li>Prices and terms are valid for 15 days from the date above, subject to availability.</li>
            <li>A sale receipt is issued once the token / advance is received.</li>
          </ol>
        ) : (
          <ol>
            <li>This is an official receipt of the payment noted above.</li>
            <li>Payments by cheque, pay order or online transfer are subject to bank realisation.</li>
            <li>Transfer of title or possession depends on full clearance of the balance due.</li>
          </ol>
        )}
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
          <div className="sig-label">{proforma ? 'Prepared by' : 'Received by'}</div>
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
          <div className="sig-label">{proforma ? 'Buyer acceptance' : 'Buyer signature'}</div>
          <div className="sig-name">{invoice.receivedFromName || invoice.buyerName || ' '}</div>
          <div className="sig-title">CNIC: {invoice.receivedFromCnic || invoice.buyerCnic || '________________'}</div>
        </div>
      </div>

      <div className="voucher-footer">
        <span>Thank you for your business</span>
        <span>Computer-generated · valid with signature and company stamp · Printed {M.fmtDate(new Date())}</span>
      </div>
      <div className="vr-footstrip">
        <BrandFooter />
      </div>
    </div>
  );
}

/** Prints the A4 voucher straight away, without opening the preview. */
export function PrintInvoiceNow({ invoice, onDone }: { invoice: Invoice; onDone: () => void }) {
  return (
    <PrintNow onDone={onDone} margin="8mm">
      <VoucherA4 invoice={invoice} />
    </PrintNow>
  );
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

  const v = voucherInfo(invoice);
  const { isSale, proforma, paid } = v;

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
      style.textContent = '@media print { @page { size: A4 portrait; margin: 8mm; } }';
    }
    document.head.appendChild(style);
    window.print();
  };

  return createPortal(
    <div className="receipt-modal-overlay" onClick={onClose}>
      <div
        className={`receipt-modal-card ${paper}`}
        role="dialog"
        aria-modal="true"
        aria-label={v.title}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Action bar (hidden in print) */}
        <div className="receipt-modal-actions">
          <div className="receipt-modal-id">
            <span className={`tag ${isSale ? 'ok' : 'mute'}`}>{M.INVOICE_LABEL[invoice.type] || 'Invoice'}</span>
            <span>
              {invoice.id} · Serial {v.serial}
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
            <VoucherA4 invoice={invoice} />
          ) : (
            <div className="thermal-slip" ref={slipRef}>
              <div className="ts-center">
                <BrandMark size={44} className="ts-logo" />
                <b className="ts-co">{M.COMPANY}</b>
                {M.COMPANY_ADDRESS && <span>{M.COMPANY_ADDRESS}</span>}
                {M.COMPANY_PHONE && <span>Cell: {M.COMPANY_PHONE}</span>}
                <b className="ts-title">{v.title}</b>
              </div>
              <div className="ts-rule" />
              <div className="ts-row"><span>Serial No.</span><b>{v.serial}</b></div>
              <div className="ts-row"><span>Invoice</span><b>{invoice.id}</b></div>
              <div className="ts-row"><span>Date</span><b>{dateOr(invoice.receiptDate)}</b></div>
              <div className="ts-rule" />
              <div className="ts-head">Buyer</div>
              <div className="ts-row"><span>Name</span><b>{invoice.buyerName || '—'}</b></div>
              <div className="ts-row"><span>CNIC</span><b>{invoice.buyerCnic || '—'}</b></div>
              {invoice.bankDetailsBuyer && <div className="ts-row"><span>Bank</span><b>{invoice.bankDetailsBuyer}</b></div>}
              <div className="ts-head">Seller</div>
              <div className="ts-row"><span>Name</span><b>{v.sellerName || '—'}</b></div>
              <div className="ts-row"><span>CNIC/NTN</span><b>{invoice.sellerCnic || '—'}</b></div>
              {invoice.bankDetailsSeller && <div className="ts-row"><span>Bank</span><b>{invoice.bankDetailsSeller}</b></div>}
              <div className="ts-rule" />
              <div className="ts-row"><span>Property</span><b>{invoice.propertyName || '—'}</b></div>
              <div className="ts-row"><span>Pay mode</span><b>{invoice.paymentMode || '—'}</b></div>
              {invoice.paymentRef && <div className="ts-row"><span>Ref.</span><b>{invoice.paymentRef}</b></div>}
              {invoice.paymentTerms && <div className="ts-row"><span>Terms</span><b>{invoice.paymentTerms}</b></div>}
              <div className="ts-rule" />
              <div className="ts-row"><span>Total price</span><b>{money(invoice.totalAmount)}</b></div>
              <div className="ts-row"><span>Token {proforma ? 'payable' : isSale ? 'received' : 'paid'}</span><b>{money(paid)}</b></div>
              <div className="ts-row ts-total"><span>Balance due</span><b>{money(invoice.balanceAmount)}</b></div>
              <div className="ts-words">Rupees {inWords(proforma ? invoice.totalAmount : paid)} Only</div>
              {proforma && <div className="ts-words">Proforma — quotation only, not a receipt.</div>}
              <div className="ts-rule" />
              <div className="ts-sig"><i />{proforma ? 'Prepared by' : 'Received by'}{invoice.receivedByName ? ` — ${invoice.receivedByName}` : ''}</div>
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
